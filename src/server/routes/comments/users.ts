import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { PrismaTypes } from "@/lib/db-types";

export const usersRouter = new Hono();

const QuerySchema = z.object({
    videoId: z.string().optional(),
    revFrom: z.string().optional(),
    revTo: z.string().optional(),
    hasDrawing: z
        .string()
        .transform(v => v === "true")
        .optional(),
});

usersRouter.openapi({
    method: "get",
    summary: "get users",
    description: "get users",
    path: "/",
    request: { query: QuerySchema },
    responses: {
        200: {
            description: "get users",
        },
    },
}, async (c) => {
    const query = c.req.valid("query");
    const {
        videoId,
        revFrom,
        revTo,
        hasDrawing,
    } = query;

    const whereVideoComment: PrismaTypes.VideoCommentWhereInput = { deleted: false };

    if (videoId) {
        whereVideoComment.videoId = videoId;
    }

    if (revFrom || revTo) {
        whereVideoComment.videoRevNum = {};
        if (revFrom) whereVideoComment.videoRevNum.gte = parseInt(revFrom);
        if (revTo) whereVideoComment.videoRevNum.lte = parseInt(revTo);
    }

    if (hasDrawing) {
        whereVideoComment.drawingPath = { not: null };
    }

    const users = await prisma.videoComment.findMany({
        where: whereVideoComment,
        distinct: ["userName", "userEmail"],
        select: { userName: true, userEmail: true },
    });
    return c.json(users);
});