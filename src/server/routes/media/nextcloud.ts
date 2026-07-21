import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { VideoReviewStorage } from "@/server/lib/storage";
import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";

export const nextCloudRouter = new Hono();

nextCloudRouter.openapi({
    method: "get",
    summary: "Get media from Nextcloud",
    description: "Returns the media file from Nextcloud.",
    path: "/:path{.*}",
    responses: {
        200: {
            description: "Get media from Nextcloud",
        },
        400: {
            description: "Invalid path",
        },
        404: {
            description: "File not found",
        },
    },
}, async (c) => {
    const relativePath = c.req.param('path');
    if (!relativePath) {
        return c.json({ error: "missing path" }, 400);
    }
    const pathSegments = relativePath.split("/");
    if (!pathSegments.length) {
        return c.json({ error: "missing path" }, 400);
    }

    if (pathSegments.some(p => p.includes(".."))) {
        return c.json({ error: "invalid path" }, 400);
    }

    const fileDriver = VideoReviewStorage.getDriver();
    if (!fileDriver || fileDriver.type() !== "nextCloud") {
        return c.json({ error: "storage not configured" }, 500);
    }

    const ncPath = pathSegments.join("/");
    const isThumbnail = ncPath.startsWith("thumbnails/");
    const ncUrl = (fileDriver as NextCloudDriver).pathUnderRoot(ncPath);
    const range = c.req.header("range");
    const res = await fetch(ncUrl, {
        method: "GET",
        headers: {
            ...(fileDriver as NextCloudDriver).getHeaders(),
            ...(range ? { Range: range } : {}),
        },
    });

    if (!res.ok || !res.body) {
        return c.json({ error: "failed to fetch media" }, 500);
    }

    const headers = new Headers();
    res.headers.forEach((value, key) => {
        headers.set(key, value);
    });

    if (isThumbnail) {
        headers.set("Cache-Control", "public, max-age=86400");
    } else {
        headers.set("Cache-Control", "no-store");
    }

    return new Response(res.body, {
        status: res.status,
        headers,
    });
});
