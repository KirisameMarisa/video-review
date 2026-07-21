import { OpenAPIHono as Hono, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const patchVideoRouter = new Hono();

const BodySchema = z.object({
    vcsWatchPaths: z.array(z.string()).optional(),
});

patchVideoRouter.openapi({
    method: "patch",
    summary: "Update video metadata",
    description: "Updates mutable metadata on a video. Intended for CI/CD use (e.g. setting vcsWatchPaths after upload).",
    path: "/",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        vcsWatchPaths: {
                            type: "array",
                            items: { type: "string" },
                            description: "Path prefixes used to filter relevant VCS changes for this video.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Video updated" },
        400: { description: "Bad request" },
        401: { description: "Unauthorized" },
        404: { description: "Video not found" },
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

    const videoId = c.req.param("id");

    let body: z.infer<typeof BodySchema>;
    try {
        body = BodySchema.parse(await c.req.json());
    } catch {
        return c.json({ error: "invalid request body" }, { status: 400 });
    }

    if (Object.keys(body).length === 0) {
        return c.json({ error: "no fields to update" }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
        return c.json({ error: "Video not found" }, { status: 404 });
    }

    const updated = await prisma.video.update({
        where: { id: videoId },
        data: {
            ...(body.vcsWatchPaths !== undefined && { vcsWatchPaths: body.vcsWatchPaths }),
        },
    });

    return c.json(updated);
});
