import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const unreadVideoIds = await prisma.$queryRaw<{ videoId: string }[]>`
        WITH latest AS (
            SELECT v.id AS "videoId",
                   c.id AS "latestCommentId"
            FROM "Video" v
            LEFT JOIN LATERAL (
                SELECT id
                FROM "VideoComment"
                WHERE "videoId" = v.id
                ORDER BY "createdAt" DESC
                LIMIT 1
            ) c ON true
        )
        SELECT l."videoId"
        FROM latest l
        LEFT JOIN "UserVideoReadStatus" s
               ON s."videoId" = l."videoId"
              AND s."userId" = ${userId}
        WHERE 
            l."latestCommentId" IS NOT NULL
            AND (
                s."lastReadCommentId" IS NULL
                OR s."lastReadCommentId" != l."latestCommentId"
            );
    `;

    return NextResponse.json({
        unreadVideoIds: unreadVideoIds.map((x) => x.videoId),
    });
}
