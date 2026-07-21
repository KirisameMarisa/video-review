import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { initRouter } from "@/server/routes/drawing/upload/init";
import { finishRouter } from "@/server/routes/drawing/upload/finish";
import { transferRouter } from "@/server/routes/drawing/upload/transfer";

export const uploadRouter = new Hono();

uploadRouter.route('/init', initRouter);
uploadRouter.route('/finish', finishRouter);
uploadRouter.route('/transfer', transferRouter);
