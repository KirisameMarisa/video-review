import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { authorize, getJwtSecret } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { hash, randomBytes } from "crypto";
import { env } from "@/lib/env";
import { formatVideoRes } from "@/server/lib/utils/format-video-res";

export const maintenanceRouter = new Hono();

const DeleteQuerySchema = z.object({
    videoId: z.string().optional(),
    deleted: z.string().transform(v => v === "true").optional(),
});

const PurgeQuerySchema = z.object({
    videoId: z.string().optional(),
    revision: z.string().transform(v => parseInt(v)).optional(),
});

maintenanceRouter.openapi({
    method: "post",
    summary: "Update video delete flag",
    description: "Update video delete flag. deleted = true means logically deleted (hidden from UI, not physically removed)",
    path: "video/delete",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: DeleteQuerySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "The video has been successfully deleted.",
        },
        403: {
            description: "Forbidden",
        }
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = c.req.valid("json");
    const { videoId, deleted } = body;

    if (videoId === undefined || deleted === undefined) {
        return c.json({ error: "missing required fields" }, 400);
    }

    const video = await prisma.video.findUnique({
        where: { id: videoId },
    });

    if (!video) {
        return c.json({ error: "video not found" }, 404);
    }

    await prisma.video.update({
        where: { id: videoId },
        data: { deleted },
    });

    return c.json({ success: true, videoId: videoId }, { status: 200 });
});

maintenanceRouter.openapi({
    method: "post",
    summary: "Delete actual video files and mark all related VideoRevision as deleted",
    path: "video/purge",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: PurgeQuerySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "The video revision has been successfully deleted.",
        },
        207: {
            description: "Marked as deleted, but failed to delete actual files"
        },
        403: {
            description: "Forbidden",
        }
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = c.req.valid("json");
    const { videoId, revision } = body;

    if (videoId === undefined || revision === undefined) {
        return c.json({ error: "missing required fields" }, 400);
    }

    const whereVideoRevision: PrismaTypes.VideoRevisionWhereUniqueInput = {
        videoId_revision: { videoId, revision },
    }

    const videoRevision = await prisma.videoRevision.findUnique({
        where: whereVideoRevision,
    });

    if (!videoRevision) {
        return c.json({ error: "video not found" }, 404);
    }

    await prisma.videoRevision.update({
        where: { id: videoRevision.id },
        data: { deleted: true },
    });

    try {
        const ret = await VideoReviewStorage.deleteObject(videoRevision.filePath);
        for (const res of env.RESOLUTION_PRESETS) {
            const derivedStorageKey = formatVideoRes(videoRevision.filePath, res);
            await VideoReviewStorage.deleteObject(derivedStorageKey);
        }

        if (!ret) {
            throw new Error("delete failed");
        }
    } catch {
        return c.json({
            warning: "VideoRevision marked as deleted, but failed to delete actual files",
            videoId,
            revision,
        }, 207)
    }

    return c.json({ success: true, videoId, revision }, { status: 200 });
});

maintenanceRouter.openapi({
    method: "post",
    summary: "rotate token",
    path: "/api-token/rotate",
    responses: {
        200: {
            description: "rotate api token",
        }
    },
}, async (c) => {
    try {
        await authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const apiToken = randomBytes(32).toString("hex");
    const tokenHash = hash("sha256", apiToken);
    await prisma.systemSecret.upsert({
        where: { key: "API_TOKEN" },
        update: { valueHash: tokenHash },
        create: { key: "API_TOKEN", valueHash: tokenHash },
    });
    return c.json({ token: apiToken });
});

maintenanceRouter.openapi({
    method: "get",
    summary: "check status",
    path: "/status",
    responses: {
        200: {
            description: "check initialized",
        }
    },
}, async (c) => {
    try {
        const hasAdmin = await prisma.user.count({ where: { role: "admin" } }) > 0;
        const hasJwt = await getJwtSecret() !== undefined
        return c.json({
            hasAdmin,
            hasJwt,
            initialized: hasAdmin && hasJwt,
        });
    } catch (e) {
        if (e instanceof ServerError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unknown error" }, { status: 500 });
    }
});