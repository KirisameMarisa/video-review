import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";

export const llmStatusRouter = new Hono();

llmStatusRouter.openapi({
    method: "get",
    summary: "LLM availability status",
    description: "Returns whether the LLM provider is configured.",
    path: "/",
    responses: {
        200: {
            description: "LLM status",
        },
    },
}, async (c) => {
    const available = createLLMClient() !== null;
    return c.json({ available });
});
