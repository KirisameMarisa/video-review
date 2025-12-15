import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    // 最新コメント1件だけ取得
    const latest = await prisma.$queryRaw<
        { latestCommentId: string | null }[]
    >`
        SELECT c.id AS "latestCommentId"
        FROM "VideoComment" c
        WHERE c."videoId" = ${videoId}
        ORDER BY c."createdAt" DESC
        LIMIT 1
    `;

    const latestCommentId = latest.length > 0 ? latest[0].latestCommentId : null;

    return NextResponse.json({ latestCommentId });
}
