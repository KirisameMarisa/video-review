import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { z } from "zod";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { createLLMClient, ChatTurn } from "@/server/lib/integration-clients/llm-client";
import { env } from "@/server/lib/env";

export const chatSearchRouter = new Hono();

const BodySchema = z.object({
    message: z.string().min(1),
    history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
    })).default([]),
});

async function createMcpClient(): Promise<McpClient> {
    const url = new URL(env.MCP_URL!);
    const client = new McpClient({ name: "video-review-chat", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(url));
    return client;
}

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
        503: { description: "LLM or MCP not configured" },
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
    if (!env.MCP_URL) {
        return c.json({ error: "MCP is not configured" }, 503);
    }

    const body = BodySchema.safeParse(await c.req.json());
    if (!body.success) {
        return c.json({ error: body.error.message }, 400);
    }

    const { message, history } = body.data;

    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const system = [
        `You are an assistant for Video Review.`,
        `Help the user find videos, comments, and events using the available tools.`,
        `Always respond in the same language as the user's message (Japanese for Japanese input, English for English input).`,
        `Today's date: ${today}`,
        `When filtering by date range, always specify BOTH videoFrom and videoTo (or both "from" and "to") together. Never specify only one side, as that would return unintended results.`,
        `When the user uses vague time expressions, interpret them as follows and call the tool immediately without asking for clarification:`,
        `  - "最近" / "recently" / "lately" → videoFrom: ${thirtyDaysAgo}, videoTo: ${today}`,
        `  - "今週" / "this week" → videoFrom: the Monday of the current week, videoTo: ${today}`,
        `  - "先週" / "last week" → videoFrom: the Monday of last week, videoTo: the Sunday of last week`,
        `  - "今月" / "this month" → videoFrom: the 1st of the current month, videoTo: ${today}`,
        `  - "先月" / "last month" → videoFrom: the 1st of last month, videoTo: the last day of last month`,
        `Answer concisely and include specific information such as video titles and comment content.`,
    ].join("\n");

    const messages: ChatTurn[] = [
        ...history as ChatTurn[],
        { role: "user", content: message },
    ];

    let mcpClient: McpClient | null = null;
    try {
        mcpClient = await createMcpClient();
        const reply = await llm.completeWithMCP(messages, mcpClient, system);
        return c.json({ reply });
    } catch (err) {
        const msg = String(err);
        if (msg.includes("max turns exceeded")) {
            return c.json({ reply: "The query required too many steps to process. Try narrowing it down." });
        }
        console.error("[chat/search]", err);
        return c.json({ error: "LLM request failed" }, 502);
    } finally {
        await mcpClient?.close?.();
    }
});
