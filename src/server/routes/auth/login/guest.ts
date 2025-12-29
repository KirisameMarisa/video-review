import { JwtError, signToken } from "@/server/lib/auth/token";
import { Role } from "@/lib/role";
import { Context, Hono } from "hono";
import { v4 as uuidv4 } from 'uuid';

export async function loginAsGuest(c: Context) {
    try {
        const { displayName } = await c.req.json();

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return c.json({ error: "jwt configuration is missing" }, 500);
        }

        if (!displayName) {
            return c.json({ error: "missing displayName" }, 400);
        }

        let role: Role = 'guest';
        let tokenPayload: Record<string, any> = {
            id: uuidv4(), displayName, role
        };
        const token = signToken(tokenPayload);

        return c.json(
            {
                token,
                id: tokenPayload.id,
                email: null,
                displayName: displayName,
                role,
            },
            { status: 200 }
        );
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as any);
        } else {
            return c.json({ error: "failed to login" }, 500);
        }
    }
};