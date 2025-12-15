import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const latest = await prisma.videoRevision.findFirst({
            where: { videoId: id },
            orderBy: { revision: "desc" },
        });

        if (!latest) {
            return NextResponse.json({ error: "No revisions found" }, { status: 404 });
        }

        return NextResponse.json(latest);
    } catch (err) {
        console.error("[GET /api/videos/:id/latest]", err);
        return NextResponse.json({ error: "Failed to fetch latest revision" }, { status: 500 });
    }
}
