import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";
import { env } from "@/server/lib/env";

export const llmStatusRouter = new Hono();

llmStatusRouter.openapi({
    method: "get",
    summary: "LLM and MCP availability status",
    description: "Returns whether the LLM provider and MCP server are configured and reachable.",
    path: "/",
    responses: {
        200: {
            description: "Status",
        },
    },
}, async (c) => {
    const llmClient = createLLMClient();
    const llm = {
        configured: llmClient !== null,
        provider: env.LLM_PROVIDER ?? null,
        model: env.LLM_MODEL ?? null,
    };

    let mcp: { configured: boolean; reachable: boolean; url: string | null; publicUrl: string | null } = {
        configured: false,
        reachable: false,
        url: env.MCP_URL ?? null,
        publicUrl: env.MCP_PUBLIC_URL ?? null,
    };

    if (env.MCP_URL) {
        mcp.configured = true;
        let mcpClient: McpClient | null = null;
        try {
            mcpClient = new McpClient({ name: "video-review-status", version: "1.0.0" });
            await mcpClient.connect(new StreamableHTTPClientTransport(new URL(env.MCP_URL)));
            await mcpClient.listTools();
            mcp.reachable = true;
        } catch (err) {
            console.error("[llm/status] MCP reachability check failed:", err);
            mcp.reachable = false;
        } finally {
            await mcpClient?.close?.();
        }
    }

    return c.json({ llm, mcp });
});
