import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
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

        return NextResponse.json(videos);
    } catch (err) {
        console.error("[GET /api/videos]", err);
        return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
}
