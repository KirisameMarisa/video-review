import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Get video comment by ID
 *     description: Returns a single video comment by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideoComment'
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await context.params;

        const comment = await prisma.videoComment.findUnique({
            where: { id },
        });

        // 404
        if (!comment) {
            return apiError("comment not found", 404);
        }

        return NextResponse.json(comment, { status: 200 });
    } catch (err) {
        console.error("[GET /api/comments/:id]", err);
        return apiError("failed to fetch comment", 500);
    }
}