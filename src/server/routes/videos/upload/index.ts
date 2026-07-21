import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { initRouter } from "@/server/routes/videos/upload/init";
import { finishRouter } from "@/server/routes/videos/upload/finish";
import { transferRouter } from "@/server/routes/videos/upload/transfer";

export const uploadRouter = new Hono();

uploadRouter.route('/init', initRouter);
uploadRouter.route('/finish', finishRouter);
uploadRouter.route('/transfer', transferRouter);
