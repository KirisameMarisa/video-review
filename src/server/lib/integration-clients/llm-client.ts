import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/server/lib/env";

export type VideoEvent = {
    start_ms: number;
    end_ms: number;
    data: string;
};

export type VideoEventContext = {
    events: VideoEvent[];
};

export type ToolDefinition = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
};

export type ToolCall = {
    id: string;
    name: string;
    input: Record<string, unknown>;
};

export type ChatTurn = {
    role: "user" | "assistant";
    content: string;
};

export interface LLMClient {
    complete(prompt: string): Promise<string>;
    completeWithTools(
        messages: ChatTurn[],
        tools: ToolDefinition[],
        onToolCall: (call: ToolCall) => Promise<string>,
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

    async completeWithTools(
        messages: ChatTurn[],
        tools: ToolDefinition[],
        onToolCall: (call: ToolCall) => Promise<string>,
        maxTurns = 5,
    ): Promise<string> {
        const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
        }));

        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        for (let turn = 0; turn < maxTurns; turn++) {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 4096,
                tools: anthropicTools,
                messages: anthropicMessages,
            });

            if (response.stop_reason === "end_turn") {
                const text = response.content.find((b) => b.type === "text");
                return text ? text.text : "";
            }

            if (response.stop_reason !== "tool_use") {
                const text = response.content.find((b) => b.type === "text");
                return text ? text.text : "";
            }

            const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
            anthropicMessages.push({ role: "assistant", content: response.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                toolUseBlocks.map(async (block) => {
                    if (block.type !== "tool_use") throw new Error("unexpected block type");
                    const result = await onToolCall({
                        id: block.id,
                        name: block.name,
                        input: block.input as Record<string, unknown>,
                    });
                    return {
                        type: "tool_result" as const,
                        tool_use_id: block.id,
                        content: result,
                    };
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

    async completeWithTools(
        messages: ChatTurn[],
        tools: ToolDefinition[],
        onToolCall: (call: ToolCall) => Promise<string>,
        maxTurns = 5,
    ): Promise<string> {
        type OllamaMessage = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string };
        const ollamaMessages: OllamaMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

        const ollamaTools = tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.inputSchema,
            },
        }));

        for (let turn = 0; turn < maxTurns; turn++) {
            const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.model,
                    messages: ollamaMessages,
                    tools: ollamaTools,
                    stream: false,
                }),
            });
            if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`);

            const data = await res.json() as {
                choices: {
                    finish_reason: string;
                    message: {
                        role: string;
                        content: string | null;
                        tool_calls?: { id: string; function: { name: string; arguments: string } }[];
                    };
                }[];
            };

            const choice = data.choices[0];
            if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
                return choice.message.content ?? "";
            }

            ollamaMessages.push({ role: "assistant", content: null, tool_calls: choice.message.tool_calls });

            for (const tc of choice.message.tool_calls) {
                const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
                const result = await onToolCall({ id: tc.id, name: tc.function.name, input });
                ollamaMessages.push({ role: "tool", content: result, tool_call_id: tc.id });
            }
        }

        throw new Error("max turns exceeded");
    }
}

class GeminiClient implements LLMClient {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    async complete(prompt: string): Promise<string> {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: "user", content: prompt }],
                }),
            }
        );
        if (!res.ok) throw new Error(`Gemini error: HTTP ${res.status}`);
        const data = await res.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content;
    }

    async completeWithTools(
        messages: ChatTurn[],
        tools: ToolDefinition[],
        onToolCall: (call: ToolCall) => Promise<string>,
        maxTurns = 5,
    ): Promise<string> {
        type GeminiMessage = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string };
        const geminiMessages: GeminiMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

        const geminiTools = tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.inputSchema,
            },
        }));

        for (let turn = 0; turn < maxTurns; turn++) {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: geminiMessages,
                        tools: geminiTools,
                    }),
                }
            );
            if (!res.ok) throw new Error(`Gemini error: HTTP ${res.status}`);

            const data = await res.json() as {
                choices: {
                    finish_reason: string;
                    message: {
                        role: string;
                        content: string | null;
                        tool_calls?: { id: string; function: { name: string; arguments: string } }[];
                    };
                }[];
            };

            const choice = data.choices[0];
            if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
                return choice.message.content ?? "";
            }

            geminiMessages.push({ role: "assistant", content: null, tool_calls: choice.message.tool_calls });

            for (const tc of choice.message.tool_calls) {
                const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
                const result = await onToolCall({ id: tc.id, name: tc.function.name, input });
                geminiMessages.push({ role: "tool", content: result, tool_call_id: tc.id });
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
            const baseUrl = env.LLM_BASE_URL ?? "http://localhost:11434";
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
