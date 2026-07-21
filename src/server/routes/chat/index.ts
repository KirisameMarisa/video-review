import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { z } from "zod";
import { ChatProviders, ChatType } from "@/server/lib/chat/chat-type";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { chatSlack, chatWebhook, chatEmail } from "@/server/lib/chat";
import { createOpenSceneLink, createVideoCommentLink } from "@/lib/url";

export const chatRouter = new Hono();

const FormSchema = z.object({
    commentId: z.string().optional(),
    commentText: z.string().optional(),
    videoId: z.string().optional(),
    videoTitle: z.string().optional(),
    folderKey: z.string().optional(),
    scenePath: z.string().optional(),
    email: z.string().optional(),
    userName: z.string().optional(),
    screenshot: z.any().openapi({
        type: "string",
        format: "binary",
        description: "Upload file",
    }),
});

function getStr(form: FormData, key: string): string | undefined {
    const v = form.get(key);
    return typeof v === "string" && v.length > 0 ? v : undefined;
}

function getFile(form: FormData, key: string): File | undefined {
    const v = form.get(key);
    return v instanceof File ? v : undefined;
}

function buildChatContext(form: FormData): ChatType {
    const baseURL = getStr(form, "baseURL");
    const videoId = getStr(form, "videoId");
    const commentId = getStr(form, "commentId");
    const scenePath = getStr(form, "scenePath");
    const sceneLink = createOpenSceneLink(scenePath!) ?? undefined;
    const videoLink = createVideoCommentLink(baseURL!, videoId!, commentId!) ?? undefined;

    return {
        commentId,
        commentText: getStr(form, "commentText"),
        videoId,
        videoTitle: getStr(form, "videoTitle"),
        folderKey: getStr(form, "folderKey"),
        scenePath,
        email: getStr(form, "email"),
        userName: getStr(form, "userName"),
        screenshot: getFile(form, "screenshot"),
        sceneLink,
        videoLink,
    };
}

chatRouter.openapi({
    method: "post",
    summary: "send chat",
    path: "/",
    request: {
        body: {
            content: {
                "multipart/form-data": {
                    schema: FormSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "List videos",
        },
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, 401);
    }

    const form = await c.req.formData();
    const ctx = buildChatContext(form);
    const notifiedProviders: ChatProviders[] = []

    if (await chatSlack(ctx)) {
        notifiedProviders.push("slack");
    }

    if (await chatWebhook(ctx)) {
        notifiedProviders.push("webhook");
    }

    if (await chatEmail(ctx)) {
        notifiedProviders.push("email");
    }

    const toastData = {
        title: "Posted to " + notifiedProviders.join(", "),
        comment: ctx.commentText,
    }
    return c.json({ notifiedProviders, toastData }, 200);
});