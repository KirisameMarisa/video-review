import { NextResponse } from "next/server";
import { WebClient } from '@slack/web-api';

export async function POST(req: Request) {
    const token = process.env.SLACK_API_TOKEN!;
    const channel = process.env.SLACK_POST_CH!;
    const client = new WebClient(token);

    const formData = await req.formData();
    const comment = formData.get("comment") as string;
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: `not found screenshot` }, { status: 500 });
    }

    const name = file.name;
    const size = file.size;

    const preparResponce = await client.files.getUploadURLExternal({ filename: name, length: size });
    if (!preparResponce.ok) {
        return NextResponse.json({ error: `prepar upload file to slack` }, { status: 500 });
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
        return NextResponse.json({ error: `upload file to slack` }, { status: 500 });
    }

    const res = await client.files.completeUploadExternal({
        initial_comment: comment,
        channel_id: channel,
        files: [{ id: fileId, title: name }]
    });
    return NextResponse.json({success: res.ok});
}
