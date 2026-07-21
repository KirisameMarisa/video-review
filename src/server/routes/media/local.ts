import { VideoReviewStorage } from "@/server/lib/storage";
import { LocalDriver } from "@/server/lib/storage/drivers/local";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import fs from "fs";
import path from "path";

export const localRouter = new Hono();

localRouter.openapi({
    method: "get",
    summary: "Get media from local storage",
    description: "Returns the media file from local storage.",
    path: "/:path{.*}",
    responses: {
        200: {
            description: "Get media from local storage",
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
    if(!relativePath) {
        return c.json({ error: "missing path" }, 400);
    }

    const fileDriver = VideoReviewStorage.getDriver();
    if (!fileDriver || fileDriver.type() !== "local") {
        return c.json({ error: "storage not configured" }, 500);
    }

    const localBaseDirectory = (fileDriver as LocalDriver).localBaseDirectory;
    if (!localBaseDirectory) {
        return c.json({ error: "local storage base directory not configured" }, 500);
    }

    const filePath = path.join(localBaseDirectory, relativePath);
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === ".mp4") {
            const stat = await fs.promises.stat(filePath);
            const fileSize = stat.size;
            const range = c.req.header("range");

            if (!range) {
                const file = await fs.promises.readFile(filePath);
                return c.body(file, 200, {
                    "Content-Type": "video/mp4",
                    "Content-Length": fileSize.toString(),
                });
            }

            const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

            const stream = fs.createReadStream(filePath, { start, end });
            return c.body(stream as any, 206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": (end - start + 1).toString(),
                "Content-Type": "video/mp4",
            });
        }

        // image fallback
        if (filePath.includes("/thumbnails/")) {
            c.header("Cache-Control", "public, max-age=86400, immutable");
        } else {
            c.header("Cache-Control", "no-store");
        }
        const data = await fs.promises.readFile(filePath);
        return c.body(data, 200);
    } catch (err: any) {
        if (err?.code === "ENOENT") {
            return c.text("Not found", 404);
        }
        return c.text("Internal error", 500);
    }
});
