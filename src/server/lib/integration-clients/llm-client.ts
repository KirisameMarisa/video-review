import Anthropic from "@anthropic-ai/sdk";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { env } from "@/server/lib/env";

export type ChatTurn = {
    role: "user" | "assistant";
    content: string;
};

type OpenAIToolCall = { id: string; function: { name: string; arguments: string } };
type OpenAIMessage = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string };

export interface LLMClient {
    complete(prompt: string): Promise<string>;
    completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns?: number,
    ): Promise<string>;
}

class ClaudeClient implements LLMClient {
    private client: Anthropic;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }

    async complete(prompt: string): Promise<string> {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
        });
        const block = response.content[0];
        if (block.type !== "text") throw new Error("Unexpected response type from Claude");
        return block.text;
    }

    async completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns = 10,
    ): Promise<string> {
        const { tools: mcpTools } = await mcpClient.listTools();

        const anthropicTools: Anthropic.Tool[] = mcpTools.map((t) => ({
            name: t.name,
            description: t.description ?? "",
            input_schema: (t.inputSchema ?? { type: "object", properties: {} }) as Anthropic.Tool["input_schema"],
        }));

        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        for (let turn = 0; turn < maxTurns; turn++) {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 4096,
                system,
                tools: anthropicTools,
                messages: anthropicMessages,
            });

            const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

            if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
                const text = response.content.find((b) => b.type === "text");
                return text ? text.text : "";
            }

            anthropicMessages.push({ role: "assistant", content: response.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                toolUseBlocks.map(async (block) => {
                    if (block.type !== "tool_use") throw new Error("unexpected block type");
                    const result = await mcpClient.callTool({ name: block.name, arguments: block.input as Record<string, unknown> });
                    const content = result.content as { type: string; text?: string }[];
                    const text = content.map((c) => c.type === "text" ? c.text ?? "" : "").join("");
                    return { type: "tool_result" as const, tool_use_id: block.id, content: text };
                }),
            );

            anthropicMessages.push({ role: "user", content: toolResults });
        }

        throw new Error("max turns exceeded");
    }
}

class OllamaClient implements LLMClient {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.model = model;
    }

    async complete(prompt: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: "user", content: prompt }],
                format: "json",
                stream: false,
            }),
        });
        if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`);
        const data = await res.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content;
    }

    async completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns = 10,
    ): Promise<string> {
        const { tools: mcpTools } = await mcpClient.listTools();

        const ollamaTools = mcpTools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description ?? "",
                parameters: t.inputSchema ?? { type: "object", properties: {} },
            },
        }));

        const ollamaMessages: OpenAIMessage[] = [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        for (let turn = 0; turn < maxTurns; turn++) {
            const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: this.model, messages: ollamaMessages, tools: ollamaTools, stream: false }),
            });
            if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`);

            const data = await res.json() as { choices: { finish_reason: string; message: { role: string; content: string | null; tool_calls?: OpenAIToolCall[] } }[] };
            const choice = data.choices[0];

            if (!choice.message.tool_calls?.length) {
                return choice.message.content ?? "";
            }

            ollamaMessages.push({ role: "assistant", content: null, tool_calls: choice.message.tool_calls });

            for (const tc of choice.message.tool_calls) {
                const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
                const result = await mcpClient.callTool({ name: tc.function.name, arguments: args });
                const content = result.content as { type: string; text?: string }[];
                const text = content.map((c) => c.type === "text" ? c.text ?? "" : "").join("");
                ollamaMessages.push({ role: "tool", content: text, tool_call_id: tc.id });
            }
        }

        throw new Error("max turns exceeded");
    }
}

class GeminiClient implements LLMClient {
    private apiKey: string;
    private model: string;
    private readonly endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    async complete(prompt: string): Promise<string> {
        const res = await fetch(this.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.apiKey}` },
            body: JSON.stringify({ model: this.model, messages: [{ role: "user", content: prompt }] }),
        });
        if (!res.ok) throw new Error(`Gemini error: HTTP ${res.status}`);
        const data = await res.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content;
    }

    async completeWithMCP(
        messages: ChatTurn[],
        mcpClient: McpClient,
        system: string,
        maxTurns = 10,
    ): Promise<string> {
        const { tools: mcpTools } = await mcpClient.listTools();

        const geminiTools = mcpTools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description ?? "",
                parameters: t.inputSchema ?? { type: "object", properties: {} },
            },
        }));

        const geminiMessages: OpenAIMessage[] = [
            { role: "system", content: system },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        for (let turn = 0; turn < maxTurns; turn++) {
            const res = await fetch(this.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.apiKey}` },
                body: JSON.stringify({ model: this.model, messages: geminiMessages, tools: geminiTools }),
            });
            if (!res.ok) throw new Error(`Gemini error: HTTP ${res.status}`);

            const data = await res.json() as { choices: { finish_reason: string; message: { role: string; content: string | null; tool_calls?: OpenAIToolCall[] } }[] };
            const choice = data.choices[0];

            if (!choice.message.tool_calls?.length) {
                return choice.message.content ?? "";
            }

            geminiMessages.push({ role: "assistant", content: null, tool_calls: choice.message.tool_calls });

            for (const tc of choice.message.tool_calls) {
                const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
                const result = await mcpClient.callTool({ name: tc.function.name, arguments: args });
                const content = result.content as { type: string; text?: string }[];
                const text = content.map((c) => c.type === "text" ? c.text ?? "" : "").join("");
                geminiMessages.push({ role: "tool", content: text, tool_call_id: tc.id });
            }
        }

        throw new Error("max turns exceeded");
    }
}

function buildClient(): LLMClient | null {
    const provider = env.LLM_PROVIDER;
    if (!provider) return null;

    switch (provider) {
        case "claude": {
            const apiKey = env.LLM_API_KEY;
            if (!apiKey) throw new Error("VIDEO_REVIEW_LLM_API_KEY is required for the Claude provider");
            const model = env.LLM_MODEL ?? "claude-haiku-4-5-20251001";
            return new ClaudeClient(apiKey, model);
        }
        case "ollama": {
            const baseUrl = env.LOCAL_LLM_URL ?? "http://localhost:11434";
            const model = env.LLM_MODEL ?? "llama3.1:8b";
            return new OllamaClient(baseUrl, model);
        }
        case "gemini": {
            const apiKey = env.LLM_API_KEY;
            if (!apiKey) throw new Error("VIDEO_REVIEW_LLM_API_KEY is required for the Gemini provider");
            const model = env.LLM_MODEL ?? "gemini-2.0-flash";
            return new GeminiClient(apiKey, model);
        }
        default:
            throw new Error(`Unknown LLM provider: ${provider}. Supported: "claude", "ollama", "gemini"`);
    }
}

const _client = buildClient();

export function createLLMClient(): LLMClient | null {
    return _client;
}
