import { createRouter } from "@/server/lib/openapi/router";
import { transferRouter } from "@/server/routes/drawing/upload/transfer";

export const uploadRouter = createRouter()
    .route('/transfer', transferRouter);
