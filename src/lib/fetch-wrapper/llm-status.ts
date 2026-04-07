export async function fetchLLMStatus(): Promise<{ available: boolean }> {
    const res = await fetch("/api/v1/llm/status");
    if (!res.ok) throw new Error("Failed to fetch LLM status");
    return res.json();
}
