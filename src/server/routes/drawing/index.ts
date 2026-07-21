import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { uploadRouter } from "@/server/routes/drawing/upload";

export const drawingRouter = new Hono();

drawingRouter.route('/upload', uploadRouter);