import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const lastUpdatedRouter = new Hono();

lastUpdatedRouter.get("/", async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const videoId = searchParams.get("videoId");
        const email = searchParams.get("email");

        // 400
        if (!videoId) {
            return c.json({ error: "missing videoId" }, 400);
        }
        if (!email) {
            return c.json({ error: "missing email" }, 400);
        }

        const latest = await prisma.videoComment.aggregate({
            _max: { updatedAt: true },
            where: {
                videoId,
                userEmail: { not: email },
            },
        });

        return c.json(
            { updatedAt: latest._max.updatedAt },
            { status: 200 }
        );

    } catch {
        return c.json({ error: "failed to fetch last updated time" }, 500);        
    }
});