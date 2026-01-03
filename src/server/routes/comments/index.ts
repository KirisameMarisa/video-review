import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { byIdRouter } from "@/routes/comments/[id]";
import { lastUpdatedRouter } from "@/routes/comments/last-updated";
import { usersRouter } from "@/routes/comments/users";

export const commentsRouter = new Hono();

commentsRouter.openapi({
    method: "get",
    summary: "Get comments",
    description: "Retrieves comments for a specific video.",
    path: "/",
    parameters: [
        {
            name: "videoId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "",
        },
        {
            name: "since",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" },
            description: "",
        },
        {
            name: "user",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "",
        },
        {
            name: "hasDrawing",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "",
        },
        {
            name: "revFrom",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "",
        },
        {
            name: "revTo",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "",
        },
    ],
    responses: {
        200: {
            description: "Comments retrieved successfully",
        }
    },
}, async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const videoId = searchParams.get("videoId");
        const since = searchParams.get("since");
        const user = searchParams.get("user");
        const hasDrawing = searchParams.get("hasDrawing");
        const revFrom = searchParams.get("revFrom");
        const revTo = searchParams.get("revTo");
        
        const where: PrismaTypes.VideoCommentWhereInput = {
            deleted: false,
        };

        if (videoId) {
           where.videoId = videoId;
        }

        if (revFrom || revTo) {
            where.videoRevNum = {};
            if (revFrom) where.videoRevNum.gte = parseInt(revFrom);
            if (revTo) where.videoRevNum.lte = parseInt(revTo);
        }

        if (since) {
            where.updatedAt = { gt: new Date(since) };
        }
   
        if(user){
            where.userName = user;
        }

        if (hasDrawing === "true") {
            where.drawingPath = { not: null };
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

commentsRouter.route("/last-updated", lastUpdatedRouter);
commentsRouter.route("/users", usersRouter);
commentsRouter.route("/:id", byIdRouter);

