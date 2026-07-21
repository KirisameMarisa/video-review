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

export interface LLMClient {
    complete(prompt: string): Promise<string>;
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
