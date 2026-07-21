import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { getVideoRouter } from "@/server/routes/videos/[id]/get-video";
import { latestRouter } from "@/server/routes/videos/[id]/latest";
import { revisionsRouter } from "@/server/routes/videos/[id]/revisions";
import { metaDataRouter } from "@/server/routes/videos/[id]/metadata";
import { eventsRouter } from "@/server/routes/videos/[id]/events";
import { vcsRouter } from "@/server/routes/videos/[id]/vcs";
import { patchVideoRouter } from "@/server/routes/videos/[id]/patch";

export const videoByIdRouter = new Hono();

videoByIdRouter.route("/", getVideoRouter);
videoByIdRouter.route("/", patchVideoRouter);
videoByIdRouter.route("/", vcsRouter);
videoByIdRouter.route("/latest", latestRouter);
videoByIdRouter.route("/revisions", revisionsRouter);
videoByIdRouter.route("/events", eventsRouter);
videoByIdRouter.route("/metadata", metaDataRouter);
