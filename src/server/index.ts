import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { mediaRouter } from "@/routes/media";
import { readStatusRouter } from "@/routes/read-status";
import { localRouter } from "@/routes/media/local";
import { nextCloudRouter } from "@/routes/media/nextcloud";
import { resolverRouter } from "@/routes/media/resolver";
import { commentsRouter } from "@/routes/comments";
import { authRouter } from "@/routes/auth";
import { adminRouter } from "@/routes/admin";
import { integrationsRouter } from "@/routes/integrations";
import { jiraRouter } from "@/routes/integrations/jira";
import { videosRouter } from "./routes/videos";
import { drawingRouter } from "./routes/drawing";
import { oldUploadRouter as oldVideoUploadRouter } from "@/routes/videos/upload/old-upload";
import { oldUploadRouter as oldDrawingUploadRouter } from "@/routes/drawing/upload/old-upload";
import { listRouter } from "@/routes/videos/list";
import { videoByIdRouter } from "@/routes/videos/[id]";
import { foldersRouter } from "@/routes/videos/folders";
import { downloadRouter } from "@/routes/media/download";
import { uploadStatusRouter } from "./routes/upload-status";
import { swaggerUI } from "@hono/swagger-ui";
import { ensurePrismaWarmup } from "@/server/lib/db";
import { avatarRouter } from "@/routes/avatar";
import { userRouter } from "@/routes/user";
import { chatRouter } from "@/routes/chat";
import { thumbnailRouter } from "@/routes/thumbnail";

export const app = new Hono().basePath("/api");

// v1 API
app.route("/v1/media", mediaRouter);
app.route("/v1/read-status", readStatusRouter);
app.route("/v1/comments", commentsRouter);
app.route("/v1/auth", authRouter);
app.route("/v1/admin", adminRouter);
app.route("/v1/integrations", integrationsRouter);
app.route("/v1/videos", videosRouter);
app.route("/v1/drawing", drawingRouter);
app.route("/v1/upload-status", uploadStatusRouter);
app.route("/v1/avatar", avatarRouter);
app.route("/v1/user", userRouter);
app.route("/v1/chat", chatRouter);
app.route("/v1/thumbnail", thumbnailRouter);

// OpenAPI and Swagger UI
app.doc('/specification', {
    openapi: '3.0.0',
    info: {
        title: 'API',
        version: '1.0.0',
    },
});

app.get('/docs',
    swaggerUI({
        url: '/api/specification',
    })
);

app.get('/internal/warmup', async (c) => {
   const ret = await ensurePrismaWarmup();
   if (ret) return c.json({ status: true });
   return c.json({ status: false });
});