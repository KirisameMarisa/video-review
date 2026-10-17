import "server-only";
import { signToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { LoginResponse } from "@/lib/auth-types";
import { ServerError } from "@/server/lib/server-error";

// What the identity provider says about who signed in; the sub is what ties it to a VideoReview user.
export interface OidcUser {
    sub: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
}

export async function loginOidcUser(oidcUser: OidcUser): Promise<LoginResponse> {
    const existing = await findLinkedUser(oidcUser);
    if (existing && !existing.active) {
        throw new ServerError("user disabled", 403);
    }

    const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { displayName: oidcUser.displayName } })
        : await prisma.user.create({ data: { email: oidcUser.email, displayName: oidcUser.displayName } });

    await prisma.identity.upsert({
        where: { provider_providerUid: { provider: "oidc", providerUid: oidcUser.sub } },
        update: { userId: user.id },
        create: { userId: user.id, provider: "oidc", providerUid: oidcUser.sub },
    });

    // The provider vouched for the person, so the role is whatever the user list says.
    const role = user.role as Role;
    const token = await signToken({ id: user.id, displayName: user.displayName, role, provider: "oidc" });

    return {
        token,
        role,
        email: user.email ?? undefined,
        displayName: user.displayName,
        id: user.id,
        provider: "oidc",
    };
}

// The sub is looked up first so a changed email keeps the same VideoReview user; email only matches the first time.
async function findLinkedUser(oidcUser: OidcUser) {
    const identity = await prisma.identity.findUnique({
        where: { provider_providerUid: { provider: "oidc", providerUid: oidcUser.sub } },
        include: { user: true },
    });
    if (identity) {
        return identity.user;
    }
    if (!oidcUser.emailVerified) {
        throw new ServerError("the identity provider has not verified the email", 401);
    }
    return prisma.user.findUnique({ where: { email: oidcUser.email } });
}
