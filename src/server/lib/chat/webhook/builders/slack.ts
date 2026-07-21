import { WebhookPayloadBuilder } from "@/server/lib/chat/webhook/index";
import { toWebhookMessage } from "@/server/lib/chat/webhook/builders/from-chat";
import { ChatType } from "@/server/lib/chat/chat-type";

export const slackBuilder: WebhookPayloadBuilder = {

    build(ctx: ChatType) {

        const msg = toWebhookMessage(ctx);

        const textBody = [
            ...msg.bodyLines,
            ...msg.links.map(l => `<${l.url}|${l.label}>`),
        ].join("\n");

        return {
            text: msg.title,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*${msg.title}*\n${textBody}`,
                    },
                },
            ],
        };
    },
};
