import { NextResponse } from "next/server";
import { WebClient } from '@slack/web-api';
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/slack/post:
 *   post:
 *     summary: Post comment and upload screenshot to Slack
 *     description: >
 *       Uploads an image file to Slack using the external upload API
 *       and posts it to the configured channel with comment.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Comment to post with the image
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Screenshot image file
 *     responses:
 *       200:
 *         description: Upload succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       400:
 *         description: not found screenshot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: slack configuration is missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       502:
 *         description: Slack upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    const token = process.env.SLACK_API_TOKEN!;
    const channel = process.env.SLACK_POST_CH!;
    if (!token || !channel) {
        return apiError("slack configuration is missing", 500);
    }

    const client = new WebClient(token);

    const formData = await req.formData();
    const comment = formData.get("comment") as string;
    const file = formData.get("file") as File | null;

    if (!file) {
        return apiError(`not found screenshot`, 400);
    }

    const name = file.name;
    const size = file.size;

    const preparResponce = await client.files.getUploadURLExternal({ filename: name, length: size });
    if (!preparResponce.ok) {
        return apiError("failed to prepare slack upload", 502);
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
        return apiError("failed to upload file to slack", 502);
    }

    const res = await client.files.completeUploadExternal({
        initial_comment: comment,
        channel_id: channel,
        files: [{ id: fileId, title: name }]
    });
    
    if (!res.ok) {
        return apiError("failed to complete slack upload", 502);
    }

    return NextResponse.json({ ok: true });
}
