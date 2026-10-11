import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { handleServerError } from "@/server/lib/server-error";
import { seenRouter } from "@/server/routes/read-status/seen";

vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    return { ...actual, authorize: vi.fn(async () => ({ type: "api-token" as const, role: "viewer" })) };
});

const app = new OpenAPIHono().route("/seen", seenRouter);
app.onError(handleServerError);

const userId = randomUUID();
const videoId = randomUUID();

function open(revision: number) {
    return app.request("http://localhost/seen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, videoId, revision }),
    });
}

describe("read-status seenRouter (DB)", () => {
    afterAll(async () => {
        await prisma.userVideoReadStatus.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
    });

    it("moves forward to a newer revision and keeps it when an older one is opened again", async () => {
        await prisma.user.create({ data: { id: userId, displayName: "Seen" } });
        // Reading the comments makes the row first, with no revision seen yet.
        await prisma.userVideoReadStatus.create({ data: { userId, videoId, lastReadCommentId: "comment" } });

        expect((await open(2)).status).toBe(200);
        expect((await open(3)).status).toBe(200);
        expect((await open(2)).status).toBe(200);

        const res = await app.request(`http://localhost/seen?userId=${userId}`);
        expect(await res.json()).toEqual({ seen: { [videoId]: 3 } });
    });
});
