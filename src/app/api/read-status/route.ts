import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/read-status:
 *   post:
 *     summary: Update last read comment status
 *     description: >
 *       Updates or creates the last read comment status for a user and video.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - videoId
 *               - lastReadCommentId
 *             properties:
 *               userId:
 *                 type: string
 *               videoId:
 *                 type: string
 *               lastReadCommentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Update succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to update read status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    try {
        const { userId, videoId, lastReadCommentId } = await req.json();

        if (!userId || !videoId || !lastReadCommentId) {
            return apiError("invalid request body", 400);
        }

        await prisma.userVideoReadStatus.upsert({
            where: {
                userId_videoId: { userId, videoId },
            },
            update: {
                lastReadCommentId,
            },
            create: {
                userId,
                videoId,
                lastReadCommentId,
            },
        });

        return NextResponse.json({ ok: true });
    } catch {
        return apiError("failed to update read status", 500);
    }
}
