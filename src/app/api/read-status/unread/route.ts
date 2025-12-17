import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/read-status/unread:
 *   get:
 *     summary: Get unread video IDs for user
 *     description: >
 *       Returns video IDs that have unread comments for the specified user.
 *       A video is considered unread if the latest comment differs from the user's last read comment.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Unread video IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadVideoIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Missing userId parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch unread video IDs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        // 400
        if (!userId) {
            return apiError("missing userId", 400);
        }

        const unreadVideoIds = await prisma.$queryRaw<{ videoId: string }[]>`
            WITH latest AS (
                SELECT v.id AS "videoId",
                       c.id AS "latestCommentId"
                FROM "Video" v
                LEFT JOIN LATERAL (
                    SELECT id
                    FROM "VideoComment"
                    WHERE "videoId" = v.id
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                ) c ON true
            )
            SELECT l."videoId"
            FROM latest l
            LEFT JOIN "UserVideoReadStatus" s
                   ON s."videoId" = l."videoId"
                  AND s."userId" = ${userId}
            WHERE 
                l."latestCommentId" IS NOT NULL
                AND (
                    s."lastReadCommentId" IS NULL
                    OR s."lastReadCommentId" != l."latestCommentId"
                );
        `;

        return NextResponse.json({
            unreadVideoIds: unreadVideoIds.map((x) => x.videoId),
        }, { status: 200 });

    } catch {
        return apiError("failed to fetch unread video ids", 500);
    }
}
