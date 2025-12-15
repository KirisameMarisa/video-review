import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const { userId, videoId, lastReadCommentId } = await req.json();

    await prisma.userVideoReadStatus.upsert({
        where: {
            userId_videoId: { userId, videoId },
        },
        update: {
            lastReadCommentId,
        },
        create: {
            userId,
            videoId,
            lastReadCommentId,
        },
    });

    return NextResponse.json({ ok: true });
}