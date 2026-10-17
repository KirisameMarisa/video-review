import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    identity: {
        findUnique: vi.fn(),
        upsert: vi.fn(async () => ({})),
    },
    user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ signToken: vi.fn(async () => "token") }));

import { loginOidcUser } from "@/server/lib/login/oidc";

const OIDC_USER = { sub: "f1a2-sub", email: "new@example.com", emailVerified: true, displayName: "Alice" };
const USER = { id: "user-1", email: "old@example.com", displayName: "Alice", role: "admin", active: true };

describe("loginOidcUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.identity.findUnique.mockResolvedValue(null);
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.update.mockImplementation(async ({ data }: { data: object }) => ({ ...USER, ...data }));
        prismaMock.user.create.mockImplementation(async ({ data }: { data: object }) => ({ ...USER, id: "user-new", ...data }));
    });

    it("keeps the user whose identity has the sub, even with a new email, with the role the user list gives", async () => {
        prismaMock.identity.findUnique.mockResolvedValue({ user: USER });

        const res = await loginOidcUser(OIDC_USER);

        expect(res).toMatchObject({ id: "user-1", role: "admin", provider: "oidc" });
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("links the sub to the user with the same email the first time", async () => {
        prismaMock.user.findUnique.mockResolvedValue(USER);

        const res = await loginOidcUser(OIDC_USER);

        expect(res.id).toBe("user-1");
        expect(prismaMock.identity.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: { userId: "user-1", provider: "oidc", providerUid: "f1a2-sub" },
        }));
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("refuses a disabled user with 403 before touching anything", async () => {
        prismaMock.identity.findUnique.mockResolvedValue({ user: { ...USER, active: false } });

        await expect(loginOidcUser(OIDC_USER)).rejects.toMatchObject({ status: 403 });
        expect(prismaMock.user.update).not.toHaveBeenCalled();
        expect(prismaMock.identity.upsert).not.toHaveBeenCalled();
    });

    it("refuses an unverified email with 401 instead of matching an existing account by it", async () => {
        prismaMock.user.findUnique.mockResolvedValue(USER);

        await expect(loginOidcUser({ ...OIDC_USER, emailVerified: false })).rejects.toMatchObject({ status: 401 });
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.identity.upsert).not.toHaveBeenCalled();
    });
});
