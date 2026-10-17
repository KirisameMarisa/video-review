import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/server/lib/token", () => ({ authorize: vi.fn(async () => ({ type: "api-token" as const })) }));
vi.mock("@/server/lib/upload-session", () => ({
    getSession: vi.fn(async () => ({ id: "session-1", storageKey: "drawing/00000000-0000-4000-8000-000000000000.png" })),
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { directUploadFromBuffer: uploadMock } }));

import { transferRouter } from "@/server/routes/drawing/upload/transfer";

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

function transfer(bytes: Uint8Array<ArrayBuffer>) {
    const form = new FormData();
    form.set("file", new File([bytes], "drawing.png", { type: "image/png" }));
    return transferRouter.request("http://localhost/?session_id=session-1", { method: "PUT", body: form });
}

describe("drawing transferRouter", () => {
    beforeEach(() => uploadMock.mockClear());

    it("stores a PNG", async () => {
        const res = await transfer(PNG_HEADER);

        expect(res.status).toBe(200);
        expect(uploadMock).toHaveBeenCalledTimes(1);
    });

    it("rejects bytes that are not a PNG, whatever the file claims to be", async () => {
        const res = await transfer(new TextEncoder().encode("<html><script>alert(1)</script></html>"));

        expect(res.status).toBe(400);
        expect(uploadMock).not.toHaveBeenCalled();
    });
});
