import { VideoReviewStorage } from "@/server/lib/storage";
import { LocalDriver } from "@/server/lib/storage/drivers/local";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorizeMedia, roleOf } from "@/server/lib/token";
import { assertRoleCanSeeVideo, videoIdForStorageKey } from "@/server/lib/videos/guest-access";
import { ServerError } from "@/server/lib/server-error";
import { contentTypeOf, formatOfExtension, kindOf } from "@/server/lib/storage/file-format";
import fs from "fs";
import path from "path";

export const localRouter = createRouter()
    .openapi(createRoute({
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
    }), async (c) => {
        const auth = await authorizeMedia(c, ["guest", "viewer", "admin"]);
        const relativePath = c.req.param('path');
        if(!relativePath) {
            return c.json({ error: "missing path" }, 400);
        }

        // Reject "../" segments up front so the guest check and the file read agree on the key.
        if (relativePath.split("/").some(p => p.includes(".."))) {
            return c.json({ error: "invalid path" }, 400);
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

        // Keep "../" from escaping the storage root and reading arbitrary files.
        const root = path.resolve(localBaseDirectory);
        const resolved = path.resolve(filePath);
        if (resolved !== root && !resolved.startsWith(root + path.sep)) {
            return c.json({ error: "invalid path" }, 400);
        }

        const role = roleOf(auth);
        if (role === "guest") {
            const videoId = await videoIdForStorageKey(relativePath);
            if (!videoId) throw new ServerError("forbidden", 403);
            await assertRoleCanSeeVideo(videoId, role);
        }

        const format = formatOfExtension(path.extname(filePath));
        // Unknown files are opaque bytes.
        const contentType = format ? contentTypeOf(format) : "application/octet-stream";
        // Uploaded bytes must never be sniffed into HTML on this origin.
        c.header("X-Content-Type-Options", "nosniff");

        try {
            if (format && kindOf(format) === "video") {
                const stat = await fs.promises.stat(filePath);
                const fileSize = stat.size;
                const range = c.req.header("range");

                if (!range) {
                    const file = await fs.promises.readFile(filePath);
                    return c.body(file, 200, {
                        "Content-Type": contentType,
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
                    "Content-Type": contentType,
                });
            }

            // image fallback
            if (filePath.includes("/thumbnails/")) {
                c.header("Cache-Control", "public, max-age=86400, immutable");
            } else {
                c.header("Cache-Control", "no-store");
            }
            const data = await fs.promises.readFile(filePath);
            return c.body(data, 200, { "Content-Type": contentType });
        } catch (err: any) {
            if (err?.code === "ENOENT") {
                return c.text("Not found", 404);
            }
            return c.text("Internal error", 500);
        }
    });
