import { JwtError, verifyToken } from "@/server/lib/token";
import { Hono } from "hono";


export const verifyRouter = new Hono();

verifyRouter.post("/", async (c) => {
    try {
        const { token } = await c.req.json();

        if (!token) {
            return c.json({ error: "missing token" }, 400);
        }

        try {
            const decoded = verifyToken(token);
            return c.json(
                { valid: true, decoded },
                { status: 200 }
            );
        } catch (e) {
            if (e instanceof JwtError) {
                return c.json({ error: e.message }, e.status as any);
            } else {
                return c.json({ error: "invalid token" }, 401);
            }
        }
    } catch {
        return c.json({ error: "failed to verify token" }, 500);
    }
});