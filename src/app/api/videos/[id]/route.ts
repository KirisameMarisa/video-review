import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: Get a video with its revisions
 *     description: >
 *       Returns a video and its revision history.
 *       Revisions are ordered by revision number in descending order.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video with revisions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Video'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch video
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    try {
        const video = await prisma.video.findUnique({
            where: { id },
            include: {
                revisions: {
                    orderBy: { revision: "desc" },
                },
            },
        });

        if (!video) {
            return apiError("Video not found", 404);
        }

        return NextResponse.json(video);
    } catch (err) {
        return apiError("Failed to fetch video", 500);
    }
}
