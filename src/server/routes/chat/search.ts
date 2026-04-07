import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { z } from "zod";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLLMClient, ChatTurn } from "@/server/lib/integration-clients/llm-client";
import { chatSearchTools, executeTool } from "@/server/lib/chat-search/tools";

export const chatSearchRouter = new Hono();

const BodySchema = z.object({
    message: z.string().min(1),
    history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
    })).default([]),
});

chatSearchRouter.openapi({
    method: "post",
    summary: "Chat search",
    description: "Search and analyze videos using natural language.",
    path: "/",
    request: {
        body: {
            content: { "application/json": { schema: BodySchema } },
        },
    },
    responses: {
        200: { description: "Chat reply" },
        400: { description: "Bad request" },
        401: { description: "Unauthorized" },
        503: { description: "LLM not configured" },
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

    const llm = createLLMClient();
    if (!llm) {
        return c.json({ error: "LLM is not configured" }, 503);
    }

    const body = BodySchema.safeParse(await c.req.json());
    if (!body.success) {
        return c.json({ error: body.error.message }, 400);
    }

    const { message, history } = body.data;

    const today = new Date().toISOString().slice(0, 10);
    const systemTurn: ChatTurn = {
        role: "user",
        content: [
            `You are an assistant for Video Review.`,
            `Help the user find videos, comments, and events using the available tools.`,
            `Answer concisely and include specific information such as video titles and comment content.`,
            `Today's date: ${today}`,
        ].join("\n"),
    };

    const messages: ChatTurn[] = [
        systemTurn,
        ...history as ChatTurn[],
        { role: "user", content: message },
    ];

    try {
        const reply = await llm.completeWithTools(
            messages,
            chatSearchTools,
            executeTool,
        );
        return c.json({ reply });
    } catch (err) {
        const msg = String(err);
        if (msg.includes("max turns exceeded")) {
            return c.json({ reply: "The query required too many steps to process. Try narrowing it down." });
        }
        console.error("[chat/search]", err);
        return c.json({ error: "LLM request failed" }, 502);
    }
});
