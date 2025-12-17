import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { apiError } from "@/lib/api-response";

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

    const filePath = videoRev.filePath.replace("/api", "");
    const abs = path.join(process.cwd(), filePath);

    if (!fs.existsSync(abs)) {
        return apiError("Video file is missing on server : " + abs, 500);
    }

    const stream = fs.createReadStream(abs);
    const filename = videoRev.video.title + "_Rev" + videoRev.revision + path.extname(abs);

    return new NextResponse(stream as any, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
