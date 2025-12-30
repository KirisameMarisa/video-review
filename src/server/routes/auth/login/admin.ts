import { JwtError, signToken } from "@/server/lib/token";
import { Role } from "@/lib/role";
import { Context, Hono } from "hono";
import bcrypt from "bcrypt";
import { prisma } from "@/server/lib/db";

export async function loginAsAdmin(c: Context) {
    try {
        const { email, password } = await c.req.json();

        if (!email) {
            return c.json({ error: "missing email" }, 400);
        }

        if (!password) {
            return c.json({ error: "missing password" }, 400);
        }

        const identity = await prisma.identity.findUnique({
            where: {
                provider_providerUid: {
                    provider: "password",
                    providerUid: email,
                }
            },
            include: {
                user: true,
            }
        });

        if (!identity || !identity.secretHash) {
            return c.json({ error: "authentication failed" }, 401);
        }

        const isPasswordValid = await bcrypt.compare(password, identity.secretHash);
        if (!isPasswordValid) {
            return c.json({ error: "authentication failed" }, 401);
        }

        const role: Role = 'admin';
        let tokenPayload: Record<string, any> = {
            id: identity.user.id, displayName: identity.user.displayName, role
        };
        const token = signToken(tokenPayload);

        return c.json(
            {
                token,
                id: identity.user.id,
                email: email,
                displayName: identity.user.displayName,
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