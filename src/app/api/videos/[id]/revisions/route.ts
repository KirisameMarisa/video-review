import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const revisions = await prisma.videoRevision.findMany({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        return NextResponse.json(revisions);
    } catch (err) {
        console.error("[GET /api/videos/:id/revisions]", err);
        return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 });
    }
}
