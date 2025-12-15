import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("videoRevId");
    const videoId = searchParams.get("videoId");

    if (!id || !videoId) {
        return NextResponse.json(
            { error: "Missing parameters" },
            { status: 400 },
        );
    }

    const videoRev = await prisma.videoRevision.findFirst({
        where: { id, videoId },
        include: {
            video: {
                select: { title: true },
            },
        },
    });

    if (!videoRev) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filePath = videoRev.filePath.replace("/api", "");
    const abs = path.join(process.cwd(), filePath);

    if (!fs.existsSync(abs)) {
        return NextResponse.json(
            { error: "file missing : " + abs },
            { status: 404 },
        );
    }

    const stream = fs.createReadStream(abs);
    const filename = videoRev.video.title + "_Rev" + videoRev.revision + path.extname(abs);

    return new NextResponse(stream as any, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
