import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/videos/{id}/latest:
 *   get:
 *     summary: Get latest revision of a video
 *     description: >
 *       Returns the latest revision for the specified video.
 *       The latest revision is determined by the highest revision number.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Latest video revision
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoRevision'
 *       404:
 *         description: No revisions found for the video
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch latest revision
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const latest = await prisma.videoRevision.findFirst({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        if (!latest) {
            return apiError("No revisions found", 404);
        }

        return NextResponse.json(latest);
    } catch (err) {
        return apiError("Failed to fetch latest revision", 500);
    }
}
