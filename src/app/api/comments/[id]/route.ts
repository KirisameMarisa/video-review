import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;

    try {
        const comment = await prisma.videoComment.findUnique({
            where: { id },
        });

        if (!comment) {
            return NextResponse.json(
                { error: "comment not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(comment);
    } catch (err) {
        console.error("[GET /api/comments/:id]", err);
        return NextResponse.json(
            { error: "Failed to fetch comment" },
            { status: 500 },
        );
    }
}
