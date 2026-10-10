import { createRouter } from "@/server/lib/openapi/router";
import { uploadRouter } from "@/server/routes/videos/upload";
import { foldersRouter } from "@/server/routes/videos/folders";
import { moveRouter } from "@/server/routes/videos/move";
import { listRouter } from "@/server/routes/videos/list";
import { videoByIdRouter } from "@/server/routes/videos/[id]";

export const videosRouter = createRouter()
    .route('/', listRouter)
    .route('/upload', uploadRouter)
    .route('/folders', foldersRouter)
    .route('/move', moveRouter)
    .route("/:id", videoByIdRouter);
