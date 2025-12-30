import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { Hono } from "hono";
import { byIdRouter } from "@/routes/comments/[id]";
import { lastUpdatedRouter } from "@/routes/comments/last-updated";

export const commentsRouter = new Hono();

commentsRouter.get("/", async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const videoId = searchParams.get("videoId");
        const since = searchParams.get("since");

        // 400
        if (!videoId) {
            return c.json({ error: "missing videoId" }, 400);
        }

        const where: PrismaTypes.VideoCommentWhereInput = {
            videoId,
            deleted: false,
        };

        if (since) {
            where.updatedAt = { gt: new Date(since) };
        }

        const comments = await prisma.videoComment.findMany({
            where,
            orderBy: { time: "asc" },
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
        const { id, comment, deleted, issueId, drawingPath, thumbsUp } = data;

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

        const updated = await prisma.videoComment.update({
            where: { id },
            data: updateData,
        });

        return c.json(updated, { status: 200 });
    } catch {
        return c.json({ error: "failed to update comment" }, 500);
    }
});

commentsRouter.route("/:id", byIdRouter);
commentsRouter.route("/last-updated", lastUpdatedRouter);
