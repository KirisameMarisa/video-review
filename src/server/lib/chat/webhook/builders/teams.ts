import { WebhookPayloadBuilder } from "@/server/lib/chat/webhook/index";
import { toWebhookMessage } from "@/server/lib/chat/webhook/builders/from-chat";
import { ChatType } from "@/server/lib/chat/chat-type";

export const teamsBuilder: WebhookPayloadBuilder = {

    build(ctx: ChatType) {

        const msg = toWebhookMessage(ctx);

        return {
            title: msg.title,
            text: [
                ...msg.bodyLines,
                ...msg.links.map(l => `${l.label}: ${l.url}`),
            ].join("\n\n"),
        };
    },
};
