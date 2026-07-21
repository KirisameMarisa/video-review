import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";

export const eventsRouter = new Hono();

const QuerySchema = z.object({
    selectRevision: z.string().transform(v => parseInt(v)).optional(),
    filterText: z.string().optional(),
    kind: z.string().optional(),
    hasLink: z.string().transform(v => v === "true").optional(),
});

eventsRouter.openapi({
    method: "get",
    summary: "Get video events",
    description: "Retrieves events for a specific video revision.",
    path: "/",
    request: { query: QuerySchema },
    responses: {
        200: {
            description: "Events retrieved successfully",
        }
    },
}, async (c) => {
    try {
        const videoId = c.req.param("id");
        const { selectRevision, filterText, kind, hasLink } = c.req.valid("query");

        const events = await prisma.videoEvent.findMany({
            where: {
                videoRevision: {
                    videoId,
                    ...(selectRevision ? { revision: selectRevision } : {}),
                },
                ...(filterText ? { data: { contains: filterText } } : {}),
                ...(kind ? { kind: { label: kind } } : {}),
            },
            include: {
                kind: {
                    select: {
                        label: true,
                    },
                },
            },
            orderBy: [
                { startMs: "asc" },
                { seq: "asc" },
            ],
        });

        return c.json(events, { status: 200 });
    } catch {
        return c.json({ error: "failed to fetch events" }, 500);
    }
});
