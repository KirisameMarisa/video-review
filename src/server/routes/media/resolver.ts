import { Hono } from "hono";
import { VideoReviewStorage } from "@/server/lib/storage";

export const resolverRouter = new Hono();

resolverRouter.get("/:path{.*}", async (c) => {
    const key = c.req.param("path");

    if (key.split("/").some(p => p.includes(".."))) {
        return c.json({ error: "invalid path" }, 400);
    }

    const url = await VideoReviewStorage.fallbackURL(key);
    if (!url) {
        return c.json({ error: "file not found" }, 404);
    }

    return c.json({ url });
});