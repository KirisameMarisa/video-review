import { Hono } from "hono";
import { authorize, JwtError } from "@/server/lib/token";
import { getSession } from "@/server/lib/upload-session";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { receiveMultipart } from "@/server/lib/utils/receive-multipart";
import fs from "fs";
import path from "path";
import { nextCloudClient } from "@/server/lib/storage/integrations/nextcloud";

export const transferRouter = new Hono();

transferRouter.put('/local', async (c) => {
    try {
        authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(c.req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return c.json({ error: "missing session_id" }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (!session) {
        return c.json({ error: "missing session" }, { status: 400 });
    }

    return receiveMultipart(c.req.raw, async (tmpFilePath: string) => {
        const fullPath = path.join(process.cwd(), "uploads", session.storageKey);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.rename(tmpFilePath, fullPath);

        if (fs.existsSync(tmpFilePath)) {
            fs.rmSync(tmpFilePath);
        }
    });
});

transferRouter.put('/nextcloud', async (c) => {
    try {
        authorize(c.req.raw, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(c.req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return c.json({ error: "missing session_id" }, { status: 400 });
    }

    const session = await getSession(session_id);
    if (!session) {
        return c.json({ error: "missing session" }, { status: 400 });
    }

    return receiveMultipart(c.req.raw, async (tmpFilePath) => {
        await nextCloudClient!.put(
            session.storageKey,
            fs.createReadStream(tmpFilePath)
        );
        await fs.promises.rm(tmpFilePath);
    });
});