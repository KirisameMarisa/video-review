import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    directUploadFromFile: vi.fn(),
    receiveMultipart: vi.fn(),
    getSession: vi.fn(),
    findFirst: vi.fn(),
}));

vi.mock("@/server/lib/token", () => ({
    authorize: vi.fn(),
}));

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        directUploadFromFile: mocks.directUploadFromFile,
    },
}));

vi.mock("@/server/lib/upload-session", () => ({
    getSession: mocks.getSession,
}));

vi.mock("@/server/lib/utils/receive-multipart", () => ({
    receiveMultipart: mocks.receiveMultipart,
}));

vi.mock("@/server/lib/db", () => ({
    prisma: {
        video: {
            findFirst: mocks.findFirst,
        },
    },
}));

import { authorize } from "@/server/lib/token";
import { transferRouter } from "@/server/routes/videos/upload/transfer";

describe("videos upload transferRouter", () => {
    it("returns 401 when authorization fails", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new Error("unauthorized"));

        const res = await transferRouter.request("http://localhost/?session_id=s1", {
            method: "PUT",
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });

    it("returns 400 when session_id is missing", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);

        const res = await transferRouter.request("http://localhost/", {
            method: "PUT",
        });

        expect(res.status).toBe(400);
    });

    it("returns 400 when session does not exist", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);
        mocks.getSession.mockResolvedValueOnce(null);

        const res = await transferRouter.request("http://localhost/?session_id=s2", {
            method: "PUT",
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "missing session" });
    });

    it("uploads multipart payload to storage key from session", async () => {
        vi.mocked(authorize).mockResolvedValueOnce(undefined);
        mocks.directUploadFromFile.mockResolvedValueOnce(undefined);
        mocks.findFirst.mockResolvedValueOnce(null);

        mocks.getSession.mockResolvedValueOnce({
            id: "s3",
            title: "Upload Video",
            folderKey: "upload-tests",
            scenePath: null,
            nextRev: 1,
            storage: "local",
            storageKey: "videos/upload-tests/Upload Video/rev_001.mp4",
            createdAt: new Date(),
        });

        mocks.receiveMultipart.mockImplementationOnce(async (_req, onUploadProcess) => {
            await onUploadProcess("/tmp/upload-part.tmp");
            return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        });

        const res = await transferRouter.request("http://localhost/?session_id=s3", {
            method: "PUT",
            headers: { "content-type": "multipart/form-data; boundary=test" },
            body: "--test--",
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true });
        expect(mocks.directUploadFromFile).toHaveBeenCalledWith(
            "videos/upload-tests/Upload Video/rev_001.mp4",
            "/tmp/upload-part.tmp",
        );
    });
});
