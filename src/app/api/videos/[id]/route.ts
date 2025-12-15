import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    try {
        const video = await prisma.video.findUnique({
            where: { id },
            include: {
                revisions: {
                    orderBy: { revision: "desc" },
                },
            },
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        return NextResponse.json(video);
    } catch (err) {
        console.error("[GET /api/videos/:id]", err);
        return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 });
    }
}
