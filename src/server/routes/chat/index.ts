import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { z } from "zod";
import { ChatProviders, ChatType } from "@/server/lib/chat/chat-type";
import { authorize } from "@/server/lib/token";
import { getUrlSchema } from "@/server/lib/integrations/general";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { chatSlack, chatWebhook, chatEmail } from "@/server/lib/chat";
import { createOpenSceneLink, createVideoCommentLink } from "@/lib/url";
import { prisma } from "@/server/lib/db";

// The public origin comes from the browser: the server may sit behind a proxy and not know it.
const FormSchema = z.object({
    baseURL: z.string().min(1),
    commentId: z.string().min(1),
    // Binary format must be spelled out: zod-openapi cannot map z.file() on its own.
    screenshot: z.file().optional().openapi({ type: "string", format: "binary" }),
});

export const chatRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "send chat",
        description: "Posts a comment to the configured chat providers; the message is built from the stored comment.",
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
                description: "Providers that received the comment and the toast to show",
                content: {
                    "application/json": {
                        schema: z.object({
                            notifiedProviders: z.string().array(),
                            toastData: z.object({ title: z.string(), comment: z.string().optional() }),
                        }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["viewer", "admin"]);

        const { baseURL, commentId, screenshot } = c.req.valid("form");
        const comment = await prisma.videoComment.findFirst({
            where: { id: commentId, deleted: false },
            include: { video: { select: { title: true, folderKey: true, scenePath: true } } },
        });
        if (!comment) {
            return c.json({ error: "comment not found" }, 404);
        }

        // The post is signed and mailed as the caller; the API token has no user behind it.
        const caller = auth.type === "jwt"
            ? await prisma.user.findUnique({ where: { id: auth.decoded.id }, select: { email: true, displayName: true } })
            : null;

        const scenePath = comment.video.scenePath ?? undefined;
        const ctx: ChatType = {
            commentId: comment.id,
            commentText: comment.comment,
            videoId: comment.videoId,
            videoTitle: comment.video.title,
            folderKey: comment.video.folderKey,
            scenePath,
            email: caller?.email ?? undefined,
            userName: caller?.displayName ?? comment.userName,
            screenshot,
            sceneLink: scenePath ? createOpenSceneLink(await getUrlSchema(), scenePath) ?? undefined : undefined,
            videoLink: createVideoCommentLink(baseURL, comment.videoId, comment.id) ?? undefined,
        };
        const notifiedProviders: ChatProviders[] = [];

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
        };
        return c.json({ notifiedProviders, toastData }, 200);
    });
