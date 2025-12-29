import { Hono } from "hono";
import { authorize, JwtError } from "@/server/lib/auth/token";
import { VideoReviewStorage } from "@/server/lib/storage";
import { createSession } from "@/lib/upload-session";
import { UploadStorageType } from "@prisma/client";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { v4 as uuidv4 } from 'uuid';

export const initRouter = new Hono();

initRouter.post('/', async (c) => {
    try {
        authorize(c.req.raw, ["viewer", "admin", "guest"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await c.req.formData();
    const savePath = formData.get("path") as string;
    const storageKey = savePath ? savePath : `drawing/${uuidv4()}.png`;

    const type = VideoReviewStorage.type();
    const session = await createSession({
        nextRev: 0,
        title: "",
        folderKey: "",
        scenePath: "",
        storageKey,
        storage: type as UploadStorageType,
    });
    const url = await VideoReviewStorage.uploadURL(session.id, storageKey, "image/png");
    return c.json({ url, session });
});