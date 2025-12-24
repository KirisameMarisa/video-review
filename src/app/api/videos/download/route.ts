import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { apiError } from "@/lib/api-response";
import { VideoReviewStorage } from "@/lib/storage";
import { authorize, JwtError } from "@/lib/jwt";

/**
 * @swagger
 * /api/videos/download:
 *   get:
 *     summary: Download a video file
 *     description: >
 *       Downloads a video file by its revision ID.
 *     parameters:
 *       - name: videoRevId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: videoId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video file stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: Video revision not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Video file is missing on server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request) {
    try {
        authorize(req, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("videoRevId");
    const videoId = searchParams.get("videoId");

    if (!id || !videoId) {
        return apiError("Missing parameters", 400);
    }

    const videoRev = await prisma.videoRevision.findFirst({
        where: { id, videoId },
        include: {
            video: {
                select: { title: true },
            },
        },
    });

    if (!videoRev) {
        return apiError("Video revision not found", 404);
    }

    const storageKey = videoRev.filePath;
    const stream = await VideoReviewStorage.download(storageKey);
    return stream;
}
