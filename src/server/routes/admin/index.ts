import { prisma } from "@/server/lib/db";
import { Hono } from "hono";
import bcrypt from "bcrypt";

export const adminRouter = new Hono();

adminRouter.post("/user", async (c) => {
    if (c.req.header("x-maintenance-token") !== process.env.ADMIN_MAINTENANCE_TOKEN) {
        return c.json({ error: "Forbidden" }, 403);
    }

    const { email, pass } = await c.req.json();
    if (!email || !pass) {
        return c.json({ error: "email and pass are required" }, 400);
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return c.json({ error: "Admin already exists. Skip." }, 410);
    }

    const hash = await bcrypt.hash(pass, 10);
    await prisma.user.create({
        data: {
            email,
            displayName: "admin",
            role: "admin",
            identities: {
                create: {
                    provider: "password",
                    providerUid: email,
                    secretHash: hash,
                },
            },
        },
    });
    return c.json({ success: true }, { status: 200 });
});