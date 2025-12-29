import { authorize, JwtError } from "@/server/lib/auth/token";
import { WebClient } from "@slack/web-api";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const postRouter = new Hono();

postRouter.post('/', async (c) => {
    try {
        authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, 401);
    }

    const token = process.env.SLACK_API_TOKEN!;
    const channel = process.env.SLACK_POST_CH!;
    if (!token || !channel) {
        return c.json({ error: "slack configuration is missing" }, 500);
    }

    const client = new WebClient(token);

    const formData = await c.req.formData();
    const comment = formData.get("comment") as string;
    const file = formData.get("file") as File | null;

    if (!file) {
        return c.json({ error: "not found screenshot" }, 400);
    }

    const name = file.name;
    const size = file.size;

    const preparResponce = await client.files.getUploadURLExternal({ filename: name, length: size });
    if (!preparResponce.ok) {
        return c.json({ error: "failed to prepare slack upload" }, 502);
    }

    const uploadUrl = preparResponce.upload_url!;
    const fileId = preparResponce.file_id!;

    const form = new FormData();
    form.append('filename', name);
    form.append('file', file, name);

    const uploadResponce = await fetch(uploadUrl, {
        method: "POST",
        body: form
    });

    if (!uploadResponce.ok) {
        return c.json({ error: "failed to upload file to slack" }, 502);
    }

    const res = await client.files.completeUploadExternal({
        initial_comment: comment,
        channel_id: channel,
        files: [{ id: fileId, title: name }]
    });

    if (!res.ok) {
        return c.json({ error: "failed to complete slack upload" }, 502);
    }

    return c.json({ ok: true });
});