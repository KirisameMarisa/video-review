import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { prisma } from "@/server/lib/db";
import { formatVideoRes } from "@/server/lib/utils/format-video-res";
import { env } from "@/lib/env";

export const downloadRouter = new Hono();

downloadRouter.openapi({
    method: "get",
    summary: "Download media",
    description: "Returns the media file for download.",
    path: "/",
    responses: {
        200: {
            description: "Download media",
        },
        400: {
            description: "Invalid parameters",
        },
        401: {
            description: "Unauthorized",
        },
        404: {
            description: "Video revision not found",
        },
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(c.req.url);
    const videoRevId = searchParams.get("videoRevId");
    const videoId = searchParams.get("videoId");
    const width = searchParams.get("width");

    console.log(`Received download request for videoId: ${videoId}, videoRevId: ${videoRevId}, width: ${width}`);

    if (!videoId || !videoRevId) {
        return c.json({ error: "Missing parameters" }, { status: 400 });
    }

    const videoRev = await prisma.videoRevision.findFirst({
        where: { 
            ...(videoRevId ? { id: videoRevId } : {}), 
            videoId 
        },
        include: {
            video: {
                select: { title: true },
            },
        },
    });

    if (!videoRev) {
        return c.json({ error: "Video revision not found" }, { status: 404 });
    }

    let storageKey = videoRev.filePath;
    if (width) {
        const targetWidth = parseInt(width);
        if (!isNaN(targetWidth) && env.RESOLUTION_PRESETS.includes(targetWidth)) {
            storageKey = formatVideoRes(storageKey, targetWidth);
        }
    }

    const stream = await VideoReviewStorage.download(storageKey);
    return stream;
});
