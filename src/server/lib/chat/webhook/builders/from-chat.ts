// webhook/from-chat.ts
import { ChatType } from "@/server/lib/chat/chat-type";

export interface WebhookMessage {
    title: string;
    bodyLines: string[];
    links: {
        label: string;
        url: string;
    }[];
}

export function toWebhookMessage(ctx: ChatType): WebhookMessage {

    const title =
        ctx.folderKey && ctx.videoTitle
            ? `${ctx.folderKey}/${ctx.videoTitle}`
            : ctx.videoTitle ?? "VideoReview";

    const bodyLines = [
        ctx.userName,
        ctx.commentText,
    ].filter(Boolean) as string[];

    const links = [];

    if (ctx.videoLink) {
        links.push({
            label: "VideoReview LINK",
            url: ctx.videoLink,
        });
    }

    if (ctx.scenePath && ctx.sceneLink) {
        links.push({
            label: "Open Scene",
            url: ctx.sceneLink,
        });
    }

    return {
        title,
        bodyLines,
        links,
    };
}
