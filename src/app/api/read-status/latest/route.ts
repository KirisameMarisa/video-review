import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/read-status/latest:
 *   get:
 *     summary: Get latest comment ID for a video
 *     description: >
 *       Returns the latest comment ID for the specified video.
 *       If the video has no comments, latestCommentId will be null.
 *     parameters:
 *       - in: query
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Latest comment ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 latestCommentId:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Missing videoId parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch latest comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");

        // 400
        if (!videoId) {
            return apiError("missing videoId", 400);
        }

        const latest = await prisma.$queryRaw<
            { latestCommentId: string | null }[]
        >`
            SELECT c.id AS "latestCommentId"
            FROM "VideoComment" c
            WHERE c."videoId" = ${videoId}
            ORDER BY c."createdAt" DESC
            LIMIT 1
        `;

        const latestCommentId =
            latest.length > 0 ? latest[0].latestCommentId : null;

        return NextResponse.json(
            { latestCommentId },
            { status: 200 }
        );
    } catch {
        return apiError("failed to fetch latest comment", 500);
    }
}