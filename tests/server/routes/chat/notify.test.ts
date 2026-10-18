import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatType } from "@/server/lib/chat/chat-type";

const chatEmailMock = vi.hoisted(() => vi.fn(async (_ctx: ChatType) => true));
const prismaMock = vi.hoisted(() => ({
    videoComment: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: vi.fn(async () => ({ type: "jwt", decoded: { id: "user-1", role: "viewer" } })) }));
vi.mock("@/server/lib/integrations/general", () => ({ getUrlSchema: vi.fn(async () => null) }));
vi.mock("@/server/lib/chat", () => ({
    chatSlack: vi.fn(async () => false),
    chatWebhook: vi.fn(async () => false),
    chatEmail: chatEmailMock,
}));

import { chatRouter } from "@/server/routes/chat";

const STORED_COMMENT = {
    id: "comment-1",
    videoId: "video-1",
    comment: "the shadow flickers at 0:12",
    userName: "reviewer",
    video: { title: "Intro", folderKey: "cuts", scenePath: null },
};

function notify(forged: Record<string, string>) {
    const form = new FormData();
    form.set("baseURL", "http://localhost:3489");
    form.set("commentId", "comment-1");
    for (const [key, value] of Object.entries(forged)) {
        form.set(key, value);
    }
    return chatRouter.request("http://localhost/", { method: "POST", body: form });
}

describe("chat notification", () => {
    beforeEach(() => {
        chatEmailMock.mockClear();
        prismaMock.videoComment.findFirst.mockResolvedValue(STORED_COMMENT);
        prismaMock.user.findUnique.mockResolvedValue({ email: "me@example.com", displayName: "Me" });
    });

    it("mails the caller, whatever address the form names", async () => {
        const res = await notify({ email: "victim@example.com" });

        expect(res.status).toBe(200);
        expect(chatEmailMock).toHaveBeenCalledTimes(1);
        expect(chatEmailMock.mock.calls[0][0].email).toBe("me@example.com");
    });

    it("builds the message from the stored comment, not from the form", async () => {
        const res = await notify({ commentText: "forged", videoTitle: "forged", userName: "someone else" });

        expect(res.status).toBe(200);
        const ctx = chatEmailMock.mock.calls[0][0];
        expect(ctx.commentText).toBe(STORED_COMMENT.comment);
        expect(ctx.videoTitle).toBe("Intro");
        expect(ctx.userName).toBe("Me");
    });
});
