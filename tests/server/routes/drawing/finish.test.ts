import { beforeEach, describe, expect, it, vi } from "vitest";

const OLD_PATH = "drawing/00000000-0000-4000-8000-000000000000.png";
const COMMENT_PATH = "drawing/comment-1.png";

const sessionKey = vi.hoisted(() => ({ value: "" }));
const deleteObjectMock = vi.hoisted(() => vi.fn(async () => true));
const deleteSessionMock = vi.hoisted(() => vi.fn(async () => {}));
const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("@/server/lib/token", () => ({ authorize: vi.fn(async () => ({ type: "api-token" as const })) }));
vi.mock("@/server/lib/upload-session", () => ({
    getSession: vi.fn(async () => ({ id: "session-1", storageKey: sessionKey.value })),
    deleteSession: deleteSessionMock,
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { deleteObject: deleteObjectMock } }));
vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));

import { finishRouter } from "@/server/routes/drawing/upload/finish";

function finish() {
    return finishRouter.request("http://localhost/?session_id=session-1&comment_id=comment-1", { method: "POST" });
}

describe("drawing finishRouter", () => {
    beforeEach(() => {
        deleteObjectMock.mockClear();
        deleteSessionMock.mockClear();
        prismaMock.videoComment.update.mockReset();
        prismaMock.videoComment.findFirst.mockResolvedValue({ id: "comment-1", drawingPath: OLD_PATH, hasDrawing: true });
    });

    it("refuses a session that was opened for another comment", async () => {
        sessionKey.value = "drawing/comment-2.png";

        const res = await finish();

        expect(res.status).toBe(400);
        expect(prismaMock.videoComment.update).not.toHaveBeenCalled();
        expect(deleteObjectMock).not.toHaveBeenCalled();
    });

    it("marks the drawing present and drops the file at the old place", async () => {
        sessionKey.value = COMMENT_PATH;
        prismaMock.videoComment.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "comment-1", ...data }));

        const res = await finish();

        expect(res.status).toBe(200);
        expect(deleteObjectMock).toHaveBeenCalledWith(OLD_PATH);
        expect(prismaMock.videoComment.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ drawingPath: COMMENT_PATH, hasDrawing: true }),
        }));
        expect(deleteSessionMock).toHaveBeenCalledWith("session-1");
    });

    it("keeps the file when the comment already draws from its own place", async () => {
        sessionKey.value = COMMENT_PATH;
        prismaMock.videoComment.findFirst.mockResolvedValue({ id: "comment-1", drawingPath: COMMENT_PATH, hasDrawing: true });
        prismaMock.videoComment.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "comment-1", ...data }));

        const res = await finish();

        expect(res.status).toBe(200);
        expect(deleteObjectMock).not.toHaveBeenCalled();
        expect(prismaMock.videoComment.update).toHaveBeenCalledTimes(1);
    });
});
