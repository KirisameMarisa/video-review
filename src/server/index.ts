import { Hono } from "hono";
import { mediaRouter } from "@/routes/media";
import { readStatusRouter } from "@/routes/read-status";
import { localRouter } from "@/routes/media/local";
import { nextCloudRouter } from "@/routes/media/nextcloud";
import { resolverRouter } from "@/routes/media/resolver";
import { commentsRouter } from "@/routes/comments";
import { authRouter } from "@/routes/auth";
import { adminRouter } from "@/routes/admin";
import { integrationsRouter } from "@/routes/integrations";
import { slackRouter } from "@/routes/integrations/slack";
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
import { openapiSpec } from "@/server/routes/openapi/spec";
import { swagger } from "@/server/routes/openapi/swagger";

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

// 旧API
app.route("/uploads", localRouter);
app.route("/read-status", readStatusRouter);
app.route("/media", resolverRouter);
app.route("/nextcloud/media", nextCloudRouter);
app.route("/comments", commentsRouter);
app.route("/auth", authRouter);
app.route("/admin", adminRouter);
app.route("/slack", slackRouter);
app.route("/jira", jiraRouter);
app.route('/videos', listRouter);
app.route("/videos/upload", oldVideoUploadRouter);
app.route("/videos/:id", videoByIdRouter);
app.route('/videos/folders', foldersRouter);
app.route('/videos/download', downloadRouter);
app.route("/drawing/upload", oldDrawingUploadRouter);

// OpenAPI and Swagger UI
app.route("/", openapiSpec);
app.route("/swagger", swagger);

console.log('Hono server is set up for Next.js API routes.', app);