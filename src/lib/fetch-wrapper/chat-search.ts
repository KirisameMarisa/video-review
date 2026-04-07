export type ChatTurn = {
    role: "user" | "assistant";
    content: string;
};

export async function sendChatSearch(
    message: string,
    history: ChatTurn[],
    token: string,
): Promise<{ reply: string }> {
    const res = await fetch("/api/v1/chat/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message, history }),
    });

    if (res.status === 503) throw new Error("LLM is not configured");
    if (res.status === 502) throw new Error("LLM request failed");
    if (!res.ok) throw new Error("Chat search failed");

    return res.json();
}
