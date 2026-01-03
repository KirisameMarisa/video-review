import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { VideoSchema } from "@/schema/zod"
import { PrismaTypes } from "@/lib/db-types";
import { z } from "zod";

export const listRouter = new Hono();

const QuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    target: z.string().optional(),
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
        from,
        to,
        target,
        filterTree,
        hasDrawing,
        hasIssue,
        hasComment,
        user,
    } = query;

    const fromDate = from ? new Date(Number(from)) : undefined;
    const toDate = to ? new Date(Number(to)) : undefined;
    const targetDate = target ? new Date(Number(target)) : undefined;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const whereVideoComment: PrismaTypes.VideoCommentWhereInput = { deleted: false };
    const whereVideo: PrismaTypes.VideoWhereInput = {};
    let whereTimeFilter: PrismaTypes.DateTimeFilter = {};

    if (from && to) {
        whereTimeFilter = { gte: fromDate, lte: toDate }
    } else if (target) {
        whereTimeFilter = { lt: targetDate }
    }

    if (user) {
        whereVideoComment.userEmail = user;
        whereVideoComment.createdAt = whereTimeFilter;
    } else {
        whereVideo.latestUpdatedAt = whereTimeFilter;
    }

    if (hasDrawing) {
        whereVideoComment.drawingPath = { not: null };
    }

    if (hasIssue) {
        whereVideoComment.issueId = { not: null };
    }

    if(hasComment) {
        whereVideo.comments = { some: whereVideoComment }
    }

    if (filterTree) {
        whereVideo.OR = [
            { title: { contains: filterTree } },
            { folderKey: { contains: filterTree } },
        ];
    }

    try {
        const videos = await prisma.video.findMany({
            where: whereVideo,
            select: {
                id: true,
                title: true,
                folderKey: true,
                scenePath: true,
                latestUpdatedAt: true,
            },
            orderBy: { title: "asc" },
        });

        return c.json(videos);
    } catch (err) {
        return c.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
});