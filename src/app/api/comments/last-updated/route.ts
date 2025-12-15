import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    const email = searchParams.get("email");

    if(!videoId) {
        return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }
    if(!email) {
        return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const latest = await prisma.videoComment.aggregate({
        _max: { updatedAt: true },
        where: { 
            videoId, 
            userEmail: { not: email } },
    });

    return NextResponse.json({ updatedAt: latest._max.updatedAt });
}
