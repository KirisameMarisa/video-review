import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Returns a list of videos
 *     description: Returns a list of videos filtered by date range, folder key, and title.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: number
 *         description: Start date (milliseconds)
 *       - in: query
 *         name: to
 *         schema:
 *           type: number
 *         description: End date (milliseconds)
 *       - in: query
 *         name: target
 *         schema:
 *           type: number
 *         description: Fetch videos updated before this date (milliseconds)
 *       - in: query
 *         name: folderKey
 *         schema:
 *           type: string
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of videos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Video'
 *       500:
 *         description: Failed to fetch videos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
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
        return apiError("Failed to fetch videos", 500);
    }
}
