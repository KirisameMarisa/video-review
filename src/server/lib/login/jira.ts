import { signToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { LoginRequest, LoginResponse } from "@/lib/auth-types";
import { ServerError } from "@/server/lib/server-error";
import { getJiraConfig, jiraAccountId, jiraAuthorization, jiraDeployment, searchJiraAccount } from "@/server/lib/integrations/jira";

// What Jira knows about an account; the id (key or accountId) is what ties it to a VideoReview user.
interface JiraUser {
    id: string;
    emailAddress: string;
    displayName: string;
}

export async function loginWithJira(c: LoginRequest): Promise<LoginResponse> {
    const jiraUser = await searchJira(c.email);
    return loginJiraUser(jiraUser);
}

// Asks Jira, with the integration's own token, whether an account with this email exists.
async function searchJira(email: string): Promise<JiraUser> {
    const { deployment: saved, baseUrl: base, email: accountEmail, token } = await getJiraConfig();
    if (!base || !token) {
        throw new ServerError("jira is not configured", 401);
    }

    const deployment = jiraDeployment(saved);
    const account = await searchJiraAccount(deployment, base, jiraAuthorization(deployment, accountEmail, token), email);
    const id = account && jiraAccountId(deployment, account);
    if (!id) {
        throw new ServerError("User not found in Jira", 401);
    }
    return { id, emailAddress: email, displayName: account.displayName || email };
}

export async function loginJiraUser(jiraUser: JiraUser): Promise<LoginResponse> {
    const existing = await findLinkedUser(jiraUser);
    if (existing && !existing.active) {
        throw new ServerError("user disabled", 403);
    }

    const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { displayName: jiraUser.displayName } })
        : await prisma.user.create({ data: { email: jiraUser.emailAddress, displayName: jiraUser.displayName } });

    await prisma.identity.upsert({
        where: { provider_providerUid: { provider: "jira", providerUid: jiraUser.id } },
        update: { userId: user.id },
        create: { userId: user.id, provider: "jira", providerUid: jiraUser.id },
    });

    // Always viewer: this login only checks that the email exists in Jira, so it must never hand out more.
    const role: Role = "viewer";
    const token = await signToken({ id: user.id, displayName: user.displayName, role, provider: "jira" });

    return {
        token,
        role,
        email: user.email ?? undefined,
        displayName: user.displayName,
        id: user.id,
        provider: "jira",
    };
}

// The Jira id is looked up first so a changed email keeps the same VideoReview user; email only matches the first time.
async function findLinkedUser(jiraUser: JiraUser) {
    const identity = await prisma.identity.findUnique({
        where: { provider_providerUid: { provider: "jira", providerUid: jiraUser.id } },
        include: { user: true },
    });
    if (identity) {
        return identity.user;
    }
    return prisma.user.findUnique({ where: { email: jiraUser.emailAddress } });
}
