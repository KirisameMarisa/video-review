import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/comments/last-updated:
 *   get:
 *     summary: Get last updated time of comments by other users
 *     description: >
 *       Returns the latest updatedAt timestamp of comments for the specified video,
 *       excluding comments created by the specified user.
 *     parameters:
 *       - in: query
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: User email to exclude
 *     responses:
 *       200:
 *         description: Latest updatedAt timestamp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       400:
 *         description: Missing required query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch last updated time
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");
        const email = searchParams.get("email");

        // 400
        if (!videoId) {
            return apiError("missing videoId", 400);
        }
        if (!email) {
            return apiError("missing email", 400);
        }

        const latest = await prisma.videoComment.aggregate({
            _max: { updatedAt: true },
            where: {
                videoId,
                userEmail: { not: email },
            },
        });

        return NextResponse.json(
            { updatedAt: latest._max.updatedAt },
            { status: 200 }
        );

    } catch {
        return apiError("failed to fetch last updated time", 500);
    }
}