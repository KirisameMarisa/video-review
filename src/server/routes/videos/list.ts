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
    limit: z.string().transform(v => parseInt(v)).optional(),
    sortBy: z.enum(["uploadedAt_desc", "uploadedAt_asc", "title_asc"]).optional(),
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
        limit,
        sortBy,
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
        const orderBy: PrismaTypes.VideoOrderByWithRelationInput[] =
            sortBy === "uploadedAt_desc" ? [{ latestRevision: { uploadedAt: "desc" } }] :
            sortBy === "uploadedAt_asc"  ? [{ latestRevision: { uploadedAt: "asc" } }] :
            [{ folderKey: "asc" }, { title: "asc" }];

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
            orderBy,
            ...(limit ? { take: limit } : {}),
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

const SearchByEventQuerySchema = z.object({
    filterText: z.string(),
    kind: z.string().optional(),
    limit: z.string().transform(v => parseInt(v)).optional(),
});

listRouter.openapi({
    method: "get",
    summary: "Search videos by event content",
    description: "Search for videos that have events (e.g. subtitles, detected objects) matching the given text. Returns matching videos with relevant event snippets.",
    path: "/search-by-event",
    request: { query: SearchByEventQuerySchema },
    responses: {
        200: { description: "Matching videos with event snippets" },
        500: { description: "Internal Server Error" },
    },
}, async (c) => {
    try {
        const { filterText, kind, limit } = c.req.valid("query");

        const matchingEvents = await prisma.videoEvent.findMany({
            where: {
                data: { contains: filterText },
                ...(kind ? { kind: { label: kind } } : {}),
                videoRevision: { deleted: false, video: { deleted: false } },
            },
            include: {
                kind: { select: { label: true } },
                videoRevision: {
                    select: {
                        videoId: true,
                        revision: true,
                        video: { select: { id: true, title: true, folderKey: true } },
                    },
                },
            },
            orderBy: { startMs: "asc" },
        });

        // Group by video, keeping up to 5 matching event snippets per video
        const byVideo = new Map<string, {
            id: string;
            title: string;
            folderKey: string | null;
            matchingEvents: { kind: string; startMs: number; endMs: number; data: string }[];
        }>();

        for (const event of matchingEvents) {
            const video = event.videoRevision.video;
            if (!byVideo.has(video.id)) {
                byVideo.set(video.id, {
                    id: video.id,
                    title: video.title,
                    folderKey: video.folderKey,
                    matchingEvents: [],
                });
            }
            const entry = byVideo.get(video.id)!;
            if (entry.matchingEvents.length < 5) {
                entry.matchingEvents.push({
                    kind: event.kind.label,
                    startMs: event.startMs,
                    endMs: event.endMs,
                    data: event.data,
                });
            }
        }

        const results = Array.from(byVideo.values());
        return c.json(limit ? results.slice(0, limit) : results);
    } catch {
        return c.json({ error: "Failed to search events" }, 500);
    }
});
