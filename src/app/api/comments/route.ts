import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get video comments
 *     description: >
 *       Returns comments for the specified video.
 *       If `since` is provided, only comments updated after that time are returned.
 *     parameters:
 *       - in: query
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *       - in: query
 *         name: since
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return comments updated after this timestamp
 *     responses:
 *       200:
 *         description: Comment list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VideoComment'
 *       400:
 *         description: Missing videoId parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");
        const since = searchParams.get("since");

        // 400
        if (!videoId) {
            return apiError("missing videoId", 400);
        }

        const where: Prisma.VideoCommentWhereInput = {
            videoId,
            deleted: false,
        };

        if (since) {
            where.updatedAt = { gt: new Date(since) };
        }

        const comments = await prisma.videoComment.findMany({
            where,
            orderBy: { time: "asc" },
        });

        return NextResponse.json(comments, { status: 200 });

    } catch {
        return apiError("failed to fetch comments", 500);
    }
}

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create video comment
 *     description: Create a new comment for a video.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - comment
 *             properties:
 *               videoId:
 *                 type: string
 *               videoRevNum:
 *                 type: number
 *               userName:
 *                 type: string
 *               userEmail:
 *                 type: string
 *               comment:
 *                 type: string
 *               time:
 *                 type: number
 *               issueId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to create comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *
 *   patch:
 *     summary: Update video comment
 *     description: Update fields of an existing comment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *               comment:
 *                 type: string
 *               issueId:
 *                 type: string
 *               deleted:
 *                 type: boolean
 *               drawingPath:
 *                 type: string
 *               thumbsUp:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Comment updated
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to update comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    try {
        const data = await req.json();
        const {
            videoId,
            videoRevNum,
            userName,
            comment,
            time,
            issueId,
            userEmail,
        } = data;

        // 400
        if (!videoId || !comment) {
            return apiError("missing required fields", 400);
        }

        const result = await prisma.videoComment.create({
            data: {
                videoId,
                videoRevNum,
                userName,
                comment,
                time,
                issueId,
                userEmail,
            },
        });

        return NextResponse.json(result, { status: 201 });
    } catch {
        return apiError("failed to create comment", 500);
    }
}

export async function PATCH(req: Request) {
    try {
        const data = await req.json();
        const { id, comment, deleted, issueId, drawingPath, thumbsUp } = data;

        // 400
        if (!id) {
            return apiError("missing id", 400);
        }

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (typeof comment === "string") {
            updateData.comment = comment;
        }
        if (typeof issueId === "string") {
            updateData.issueId = issueId;
        }
        if (typeof deleted === "boolean") {
            updateData.deleted = deleted;
        }
        if (typeof drawingPath === "string") {
            updateData.drawingPath = drawingPath;
        }
        if (thumbsUp === true) {
            updateData.thumbsUp = { increment: 1 };
        }

        const updated = await prisma.videoComment.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updated, { status: 200 });
    } catch {
        return apiError("failed to update comment", 500);
    }
}
