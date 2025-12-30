import { JwtError, signToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { Context } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

export async function loginWithJira(c: Context) {
    try {
        const { email } = await c.req.json();

        if (!email) {
            return c.json({ error: "missing email" }, 400);
        }

        // 1. JIRA 認証
        let jiraInfo;
        try {
            jiraInfo = await authenticateWithJira(email);
        } catch {
            return c.json({ error: "failed to authenticate with jira" }, 401);
        }

        // 2. User upsert
        const userDB = await upsertUser(
            email,
            jiraInfo.displayName
        );

        // 3. Identity upsert
        await upsertJiraIdentity(
            userDB.id,
            jiraInfo.jira.userKey
        );

        const role: Role = 'viewer';
        let tokenPayload: Record<string, any> = {
            id: userDB.id, displayName: userDB.displayName, role
        };
        const token = signToken(tokenPayload);

        return c.json(
            {
                token,
                id: userDB.id,
                email: email,
                displayName: userDB.displayName,
                role,
            },
            { status: 200 }
        );
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
}

async function authenticateWithJira(email: string) {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL!;
    const res = await fetch(`${base}/rest/api/2/user/search?username=${email}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.JIRA_API_TOKEN!}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

    if (!res.ok) throw new Error("Cannot get Jira info");

    const users = await res.json();
    if (!users?.length) throw new Error("User not found in Jira");

    const user = users[0];
    return {
        displayName: user.displayName || email,
        jira: {
            userKey: user.key,
        },
    };
}

async function upsertJiraIdentity(userId: string, accountId: string) {
    return prisma.identity.upsert({
        where: {
            provider_providerUid: {
                provider: 'jira',
                providerUid: accountId,
            }
        },
        update: { userId },
        create: {
            userId,
            provider: 'jira',
            providerUid: accountId,
        },
    });
}

async function upsertUser(email: string, displayName: string) {
    return prisma.user.upsert({
        where: { email },
        update: { displayName },
        create: { email, displayName },
    });
}
