import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const listRouter = new Hono();

listRouter.get('/', async (c) => {
    const { searchParams } = new URL(c.req.url);
    const fromMs = searchParams.get("from");
    const toMs = searchParams.get("to");
    const targetMs = searchParams.get("target");
    const folderKey = searchParams.get("folderKey");
    const title = searchParams.get("title");

    const fromDate = fromMs ? new Date(Number(fromMs)) : undefined;
    const toDate = toMs ? new Date(Number(toMs)) : undefined;
    const targetDate = targetMs ? new Date(Number(targetMs)) : undefined;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const dateFilter =
        fromDate && toDate
            ? {
                latestUpdatedAt: {
                    gte: fromDate,
                    lte: toDate,
                },
            }
            : targetDate
                ? {
                    latestUpdatedAt: {
                        lt: targetDate,
                    },
                }
                : {};

    try {
        const videos = await prisma.video.findMany({
            where: {
                ...dateFilter,
                ...(title ? { title } : {}),
                ...(folderKey ? { folderKey: { contains: folderKey, } } : {})
            },
            select: {
                id: true,
                title: true,
                folderKey: true,
                scenePath: true,
                latestUpdatedAt: true,
            },
            orderBy: { title: "asc" },
        });

        return c.json(videos);
    } catch (err) {
        return c.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
});