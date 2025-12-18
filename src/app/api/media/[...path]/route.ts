import { NextResponse } from "next/server";
import path from "path";
import { apiError } from "@/lib/api-response";
import { VideoReviewStorage } from "@/lib/storage";

/**
 * @swagger
 * /api/media/{path}:
 *   get:
 *     summary: Get media URL for a file
 *     description: >
 *       Resolves a file path and returns a media-ready URL.
 *       The returned URL may be a local path or a signed S3 URL,
 *       depending on the configured storage backend.
 *     parameters:
 *       - name: path
 *         in: path
 *         required: true
 *         description: >
 *           file path.
 *           This is a catch-all parameter and may contain slashes.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: media URL resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: Invalid path
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathSegments } = await params;

    if (pathSegments.some(p => p.includes(".."))) {
        return apiError("invalid path", 400);
    }

    console.log("Fetching media for path segments:", pathSegments);

    const filePath = path.join(...pathSegments);
    const url = await VideoReviewStorage.fallbackURL(filePath);

    if (!url) {
        return apiError("file not found", 404);
    }

    return NextResponse.json({ url }, { status: 200 });
}
