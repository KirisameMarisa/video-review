import { Role } from "../role";
export type LoginType = "guest" | "jira" | "admin";

export async function login(type: LoginType, payload: Record<string, any>):
    Promise<{ token: string; id: string; email: string | null; displayName: string, role: Role }> 
{
    const res = await fetch(`/api/v1/auth/login/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to login");
    return await res.json();
}

export async function authVerify(token: string): Promise<{ id: string; displayName: string, role: Role }> {
    const res = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error("Failed to verify");
    const json = await res.json();
    return json.decoded;
}

