import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { byIdRouter } from "@/server/routes/comments/[id]";
import { lastUpdatedRouter } from "@/server/routes/comments/last-updated";
import { usersRouter } from "@/server/routes/comments/users";
import { z } from "zod";
import { toDateRange } from "@/lib/utils/date-helper";

export const commentsRouter = new Hono();

const QuerySchema = z.object({
    videoId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    hasDrawing: z.string().transform(v => v === "true").optional(),
    hasIssue: z.string().transform(v => v === "true").optional(),
    fetchAllComments: z.string().transform(v => v === "true").optional(),
    selectRevision: z.string().transform(v => parseInt(v)).optional(),
    user: z.string().optional(),
    filterText: z.string().optional(),
});

commentsRouter.openapi({
    method: "get",
    summary: "Get comments",
    description: "Retrieves comments for a specific video.",
    path: "/",
    request: { query: QuerySchema },
    responses: {
        200: {
            description: "Comments retrieved successfully",
        }
    },
}, async (c) => {
    try {
        const query = c.req.valid("query");
        const {
            videoId,
            from,
            to,
            hasDrawing,
            hasIssue,
            fetchAllComments,
            selectRevision,
            user,
            filterText,
        } = query;

        const dateRange = toDateRange(new Date(Number(from)), new Date(Number(to)));

        const where: PrismaTypes.VideoCommentWhereInput = {
            deleted: false,
        };

        if (videoId) {
            where.videoId = videoId;
        }

        if (dateRange.from !== undefined && dateRange.to !== undefined) {
            where.createdAt = { gte: dateRange.from, lte: dateRange.to };
        }

        if (fetchAllComments) {
            where.videoRevNum = {};
        } else if (selectRevision) {
            where.videoRevNum = selectRevision;
        }

        if (hasIssue) {
            where.issueId = { not: null };
        }

        if (user) {
            where.userName = user;
        }

        if (hasDrawing) {
            where.drawingPath = { not: null };
        }

        if (filterText) {
            where.comment = { contains: filterText };
        }

        const comments = await prisma.videoComment.findMany({
            where,
            orderBy: { time: "asc" }
        });

        return c.json(comments, { status: 200 });
    } catch {
        return c.json({ error: "failed to fetch comments" }, 500);
    }
});

commentsRouter.post("/", async (c) => {
    try {
        const data = await c.req.json();
        const {
            videoId,
            videoRevNum,
            userName,
            comment,
            time,
            issueId,
            userEmail,
        } = data;

        // 400
        if (!videoId || !comment) {
            return c.json({ error: "missing required fields" }, 400);
        }

        const result = await prisma.videoComment.create({
            data: {
                videoId,
                videoRevNum,
                userName,
                comment,
                time,
                issueId,
                userEmail,
            },
        });

        return c.json(result, { status: 201 });
    } catch {
        return c.json({ error: "failed to create comment" }, 500);
    }
});

commentsRouter.patch("/", async (c) => {
    try {
        const data = await c.req.json();
        const { id, comment, deleted, issueId, drawingPath, thumbsUp, notifiedProviders } = data;

        // 400
        if (!id) {
            return c.json({ error: "missing id" }, 400);
        }

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (typeof comment === "string") {
            updateData.comment = comment;
        }
        if (typeof issueId === "string") {
            updateData.issueId = issueId;
        }
        if (typeof deleted === "boolean") {
            updateData.deleted = deleted;
        }
        if (typeof drawingPath === "string") {
            updateData.drawingPath = drawingPath;
        }
        if (thumbsUp === true) {
            updateData.thumbsUp = { increment: 1 };
        }
        if (notifiedProviders) {
            updateData.notifiedProviders = notifiedProviders;
        }

        const updated = await prisma.videoComment.update({
            where: { id },
            data: updateData
        });

        return c.json(updated, { status: 200 });
    } catch {
        return c.json({ error: "failed to update comment" }, 500);
    }
});

commentsRouter.route("/last-updated", lastUpdatedRouter);
commentsRouter.route("/users", usersRouter);
commentsRouter.route("/:id", byIdRouter);

