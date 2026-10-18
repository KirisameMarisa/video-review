import { createRouter } from "@/server/lib/openapi/router";
import { uploadRouter } from "@/server/routes/drawing/upload";

export const drawingRouter = createRouter()
    .route('/upload', uploadRouter);
