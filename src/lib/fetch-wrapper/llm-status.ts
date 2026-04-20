export type LLMStatus = {
    llm: { configured: boolean; provider: string | null; model: string | null };
    mcp: { configured: boolean; reachable: boolean; url: string | null; publicUrl: string | null };
};

export async function fetchLLMStatus(): Promise<LLMStatus> {
    const res = await fetch("/api/v1/llm/status");
    if (!res.ok) throw new Error("Failed to fetch LLM status");
    return res.json();
}
