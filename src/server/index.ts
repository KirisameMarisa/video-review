import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { mediaRouter } from "@/server/routes/media";
import { readStatusRouter } from "@/server/routes/read-status";
import { localRouter } from "@/server/routes/media/local";
import { nextCloudRouter } from "@/server/routes/media/nextcloud";
import { resolverRouter } from "@/server/routes/media/resolver";
import { commentsRouter } from "@/server/routes/comments";
import { authRouter } from "@/server/routes/auth";
import { adminRouter } from "@/server/routes/admin";
import { integrationsRouter } from "@/server/routes/integrations";
import { jiraRouter } from "@/server/routes/integrations/jira";
import { videosRouter } from "./routes/videos";
import { drawingRouter } from "./routes/drawing";
import { oldUploadRouter as oldVideoUploadRouter } from "@/server/routes/videos/upload/old-upload";
import { oldUploadRouter as oldDrawingUploadRouter } from "@/server/routes/drawing/upload/old-upload";
import { listRouter } from "@/server/routes/videos/list";
import { videoByIdRouter } from "@/server/routes/videos/[id]";
import { foldersRouter } from "@/server/routes/videos/folders";
import { downloadRouter } from "@/server/routes/media/download";
import { uploadStatusRouter } from "./routes/upload-status";
import { swaggerUI } from "@hono/swagger-ui";
import { ensurePrismaWarmup } from "@/server/lib/db";
import { avatarRouter } from "@/server/routes/avatar";
import { userRouter } from "@/server/routes/user";
import { chatRouter } from "@/server/routes/chat";
import { thumbnailRouter } from "@/server/routes/thumbnail";

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