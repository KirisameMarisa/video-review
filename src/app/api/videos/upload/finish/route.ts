export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { deleteSession, getSession } from "@/lib/upload-session";

export async function POST(req: Request): Promise<Response> {
    try {
        authorize(req, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return apiError("missing session_id", 400);
    }

    const session = await getSession(session_id);
    if (!session) {
        return apiError("missing session", 400);
    }

    const title = session.title
    const folderKey = session.folderKey
    const scenePath = session.scenePath
    const nextRev = session.nextRev;
    const storageKey = session.storageKey;

    const revision = await prisma.$transaction(async (tx) => {
        let video = await prisma.video.findFirst({ where: { title, folderKey } });
        if (!video) {
            video = await prisma.video.create({ data: { title, folderKey, scenePath } });
        } else {
            await prisma.video.update({
                where: { id: video.id },
                data: { latestUpdatedAt: new Date() },
            });
        }

        return await prisma.videoRevision.create({
            data: {
                id: session.id,
                videoId: video.id,
                revision: nextRev,
                filePath: storageKey,
            },
        });
    });


    await deleteSession(session_id);
    return NextResponse.json(revision);
}
