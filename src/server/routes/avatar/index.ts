import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { avatarIntegration, avatarLocal } from "@/server/lib/avatar";
import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { Readable } from "stream";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { newAvatarKey } from "@/lib/storage-key";

const GetQuerySchema = z.object({
    email: z.string().optional(),
});

const UploadBodySchema = z.object({
    // Binary format must be spelled out: zod-openapi cannot map z.file() on its own.
    file: z.file().optional().openapi({ type: "string", format: "binary" }),
});

export const avatarRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get avatar",
        path: "/local",
        request: { query: GetQuerySchema },
        responses: {
            200: {
                description: "Avatar retrieved successfully",
                content: {
                    "application/json": {
                        schema: z.object({ avatarUrl: z.string().optional() }),
                    },
                },
            },
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);
        try {
            const { email } = c.req.valid("query");

            if (!email) {
                return c.json({ avatarUrl: undefined }, 200);
            }

            const avatarUrl = await avatarLocal(email);
            return c.json({ avatarUrl }, 200);

        } catch {
            return c.json({ avatarUrl: undefined }, 200);
        }
    })
    .openapi(createRoute({
        method: "get",
        summary: "Get avatar",
        path: "/integration",
        request: { query: GetQuerySchema },
        responses: {
            200: {
                description: "Avatar retrieved successfully",
            }
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);
        try {
            const { email } = c.req.valid("query");

            if (!email) {
                return new NextResponse(null, { status: 204 });
            }

            const result = await avatarIntegration(email);
            if (!result) {
                return new NextResponse(null, { status: 204 });
            }

            return new NextResponse(result.buffer, { status: 200 });
        } catch {
            return new NextResponse(null, { status: 204 });
        }
    })
    .openapi(createRoute({
        method: "put",
        summary: "upload user avatar",
        path: "/upload",
        request: {
            body: {
                content: {
                    "multipart/form-data": {
                        schema: UploadBodySchema,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Icon upload successful",
                content: {
                    "application/json": {
                        schema: z.object({ ok: z.boolean() }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Failed to upload avatar"),
        },
    }), async (c) => {
        // The avatar is the caller's own; the API token has no user to hang one on.
        const auth = await authorize(c.req.raw, ["viewer", "admin"]);
        if (auth.type !== "jwt") {
            throw new ServerError("forbidden", 403);
        }

        try {
            const body = await c.req.parseBody();
            const file = body.file;

            if (!(file instanceof File)) {
                return c.json({ error: "file is required" }, 400);
            }

            if (file.size > 1_000_000) {
                return c.json({ error: "file too large" }, 400);
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const storageKey = newAvatarKey();
            await VideoReviewStorage.directUploadFromBuffer(storageKey, Readable.from(buffer), "image/png")
            await prisma.user.update({
                where: { id: auth.decoded.id },
                data: { avatarPath: storageKey },
            });
            return c.json({ ok: true }, 200);
        } catch (e) {
            return c.json({ error: "failed to upload avatar" }, 500);
        }
    });
