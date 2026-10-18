import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { PrismaTypes } from "@/lib/db-types";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

const QuerySchema = z.object({
    videoId: z.string().optional(),
    revFrom: z.string().optional(),
    revTo: z.string().optional(),
    hasDrawing: z
        .string()
        .transform(v => v === "true")
        .optional(),
});

export const usersRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "get users",
        description: "get users",
        path: "/",
        request: { query: QuerySchema },
        responses: {
            200: {
                description: "get users",
                content: {
                    "application/json": {
                        schema: z.array(z.object({ userName: z.string(), userEmail: z.string() })),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

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
            whereVideoComment.hasDrawing = true;
        }

        const users = await prisma.videoComment.findMany({
            where: whereVideoComment,
            distinct: ["userName", "userEmail"],
            select: { userName: true, userEmail: true },
        });
        return c.json(users, 200);
    });
