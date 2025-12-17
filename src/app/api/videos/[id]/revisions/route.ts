import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/videos/{id}/revisions:
 *   get:
 *     summary: Get revisions of a video
 *     description: >
 *       Returns all revisions for the specified video.
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
 *         description: List of video revisions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VideoRevision'
 *       500:
 *         description: Failed to fetch revisions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const revisions = await prisma.videoRevision.findMany({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        return NextResponse.json(revisions);
    } catch (err) {
        return apiError("Failed to fetch revisions", 500);
    }
}
