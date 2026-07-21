import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { VideoSchema } from "@/schema/zod"
import { PrismaTypes } from "@/lib/db-types";
import { z } from "zod";
import { toDateRange } from "@/lib/utils/date-helper";

export const listRouter = new Hono();

const QuerySchema = z.object({
    videoFrom: z.string().optional(),
    videoTo: z.string().optional(),
    commentsFrom: z.string().optional(),
    commentsTo: z.string().optional(),
    name: z.string().optional(),
    filterTree: z.string().optional(),
    user: z.string().optional(),
    hasDrawing: z
        .string()
        .transform(v => v === "true")
        .optional(),
    hasIssue: z
        .string()
        .transform(v => v === "true")
        .optional(),
    hasComment: z
        .string()
        .transform(v => v === "true")
        .optional(),
    includeRevisions: z
        .string()
        .transform(v => v === "true")
        .optional(),
    tags: z
        .string()
        .transform((v) => v
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        ).optional(),
});

listRouter.openapi({
    method: "get",
    summary: "Returns a list of videos",
    description: "Returns a list of videos filtered by date range, folder key, and title.",
    path: "/",
    request: { query: QuerySchema },
    responses: {
        200: {
            description: "List videos",
            content: {
                "application/json": {
                    schema: VideoSchema.array(),
                },
            },
        },
        500: {
            description: "Internal Server Error",
        }
    },
}, async (c) => {
    const query = c.req.valid("query");
    const {
        videoFrom,
        videoTo,
        commentsFrom,
        commentsTo,
        filterTree,
        hasDrawing,
        hasIssue,
        hasComment,
        user,
        includeRevisions,
        tags,
    } = query;

    const videoDateRange = toDateRange(new Date(Number(videoFrom)), new Date(Number(videoTo)));
    const commentsDateRange = toDateRange(new Date(Number(commentsFrom)), new Date(Number(commentsTo)));

    const whereVideoComment: PrismaTypes.VideoCommentWhereInput = { deleted: false };
    const whereVideo: PrismaTypes.VideoWhereInput = { deleted: false };
    const latestRevisionIs: PrismaTypes.VideoRevisionWhereInput = { deleted: false };

    if (user) {
        whereVideoComment.userName = user;
    }

    if (commentsDateRange.from !== undefined && commentsDateRange.to !== undefined) {
        whereVideoComment.createdAt = { gte: commentsDateRange.from, lte: commentsDateRange.to };
    }

    if (videoDateRange.from !== undefined && videoDateRange.to !== undefined) {
        latestRevisionIs.uploadedAt = { gte: videoDateRange.from, lte: videoDateRange.to };
    }

    if (hasDrawing) {
        whereVideoComment.drawingPath = { not: null };
    }

    if (hasIssue) {
        whereVideoComment.issueId = { not: null };
    }

    if (hasComment) {
        whereVideo.comments = { some: whereVideoComment }
    }

    if (filterTree) {
        whereVideo.OR = [
            { title: { contains: filterTree } },
            { folderKey: { contains: filterTree } },
        ];
    }

    if (tags && tags.length > 0) {
        latestRevisionIs.tags = { hasSome: tags };
    }

    if (latestRevisionIs.uploadedAt !== undefined || latestRevisionIs.tags !== undefined) {
        whereVideo.latestRevision = { is: latestRevisionIs };
    }

    try {
        const videos = await prisma.video.findMany({
            where: whereVideo,
            include: {
                latestRevision: {
                    select: {
                        revision: true,
                        uploadedAt: true,
                        tags: true,
                    },
                },
                ...(includeRevisions ? {
                    revisions: {
                        where: { deleted: false },
                        orderBy: { revision: "asc" },
                    },
                } : {}),
            },
            orderBy: [
                { folderKey: "asc" },
                { title: "asc" },
            ]
        });

        const previewCount = Math.min(videos.length, 30);
        const preview = videos.slice(0, previewCount).map(v => ({
            folderKey: v.folderKey,
            title: v.title,
        }));

        console.log("[VideoSearch]", {
            total: videos.length,
            preview,
        });
        return c.json(videos);
    } catch (err) {
        return c.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
});

listRouter.openapi({
    method: "get",
    summary: "Get all video tags",
    description: "Returns a deduplicated list of tags from all non-deleted videos.",
    path: "/tags",
    responses: {
        200: {
            description: "List of tags",
            content: {
                "application/json": {
                    schema: z.array(z.string()),
                },
            },
        },
        500: {
            description: "Internal Server Error",
        },
    },
}, async (c) => {
    try {
        const videos = await prisma.video.findMany({
            where: { deleted: false },
            include: {
                latestRevision: {
                    select: {
                        revision: true,
                        uploadedAt: true,
                        tags: true,
                    },
                },
            },
            orderBy: [
                { folderKey: "asc" },
                { title: "asc" },
            ]
        });

        const tags = Array.from(
            new Set(
                videos
                    .flatMap((video) => video.latestRevision ? video.latestRevision.tags : [])
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0)
            )
        ).sort((a, b) => a.localeCompare(b));

        return c.json(tags);
    } catch {
        return c.json({ error: "Failed to fetch video tags" }, { status: 500 });
    }
});

listRouter.openapi({
    method: "get",
    summary: "",
    path: "/event-kinds",
    responses: {
        200: {
            description: "",
        }
    },
}, async (c) => {
    const items = await prisma.videoEventKind.findMany({ select: { label: true } })
    return c.json({ items: items.map(x => x.label) });
});
