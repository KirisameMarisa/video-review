import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const getJiraConfigMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ signToken: vi.fn(async () => "token") }));
vi.mock("@/server/lib/integrations/jira", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/integrations/jira")>()),
    getJiraConfig: getJiraConfigMock,
}));

import { loginJiraUser, loginWithJira } from "@/server/lib/login/jira";

const JIRA_USER = { id: "JIRAUSER100", emailAddress: "new@example.com", displayName: "Hitori" };
const USER = { id: "user-1", email: "old@example.com", displayName: "Hitori", role: "admin", active: true };

beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.identity.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockImplementation(async ({ data }: { data: object }) => ({ ...USER, ...data }));
    prismaMock.user.create.mockImplementation(async ({ data }: { data: object }) => ({ ...USER, id: "user-new", ...data }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("loginJiraUser", () => {
    it("keeps the user whose identity has the Jira id, even with a new email", async () => {
        prismaMock.identity.findUnique.mockResolvedValue({ user: USER });

        const res = await loginJiraUser(JIRA_USER);

        expect(res).toMatchObject({ id: "user-1", role: "viewer", provider: "jira" });
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("links the Jira id to the user with the same email the first time", async () => {
        prismaMock.user.findUnique.mockResolvedValue(USER);

        const res = await loginJiraUser(JIRA_USER);

        expect(res.id).toBe("user-1");
        expect(prismaMock.identity.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: { userId: "user-1", provider: "jira", providerUid: "JIRAUSER100" },
        }));
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("refuses a disabled user with 403 before touching anything", async () => {
        prismaMock.identity.findUnique.mockResolvedValue({ user: { ...USER, active: false } });

        await expect(loginJiraUser(JIRA_USER)).rejects.toMatchObject({ status: 403 });
        expect(prismaMock.user.update).not.toHaveBeenCalled();
        expect(prismaMock.identity.upsert).not.toHaveBeenCalled();
    });
});

describe("loginWithJira", () => {
    it("on Jira Cloud, searches the email as a query with Basic auth and links the accountId", async () => {
        getJiraConfigMock.mockResolvedValue({ deployment: "cloud", baseUrl: "https://example.atlassian.net", email: "bot@example.com", token: "t0ken" });
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [{ accountId: "5b10a2844c20165700ede21g", displayName: "Hitori" }] }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await loginWithJira({ email: "new@example.com", password: "", displayName: "" });

        expect(fetchMock).toHaveBeenCalledWith(
            "https://example.atlassian.net/rest/api/2/user/search?query=new%40example.com",
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Basic ${Buffer.from("bot@example.com:t0ken").toString("base64")}` }) }),
        );
        expect(prismaMock.identity.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: { userId: "user-new", provider: "jira", providerUid: "5b10a2844c20165700ede21g" },
        }));
        expect(res.displayName).toBe("Hitori");
    });
});
