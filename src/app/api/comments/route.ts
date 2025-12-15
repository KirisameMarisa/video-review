import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    const since = searchParams.get("since");
    if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

    const where: Prisma.VideoCommentWhereInput = { videoId, deleted: false };
    if (since) {
        where.updatedAt = { gt: new Date(since) };
    }

    const comments = await prisma.videoComment.findMany({
        where,
        orderBy: { time: "asc" },
    });

    return NextResponse.json(comments);
}

export async function POST(req: Request) {
    const data = await req.json();
    const { videoId, videoRevNum, userName, comment, time, issueId, userEmail } = data;

    if (!videoId || !comment)
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const result = await prisma.videoComment.create({
        data: {
            videoId,
            videoRevNum,
            userName,
            comment,
            time,
            issueId,
            userEmail,
        },
    });
    return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: Request) {
    const data = await req.json();
    const { id, comment, deleted, issueId, drawingPath, thumbsUp } = data;

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const updateData: any = {
        updatedAt: new Date(),
    };

    if (typeof comment === "string") {
        updateData.comment = comment;
    }
    if (typeof issueId === "string") {
        updateData.issueId = issueId;
    }
    if (typeof deleted === "boolean") {
        updateData.deleted = deleted;
    }
    if (typeof drawingPath === "string") {
        updateData.drawingPath = drawingPath;
    }
    if (thumbsUp === true) {
        updateData.thumbsUp = { increment: 1 };
    }

    const updated = await prisma.videoComment.update({
        where: { id },
        data: updateData,
    });

    return NextResponse.json(updated);
}
