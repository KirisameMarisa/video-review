import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const keys = await prisma.video.findMany({
        select: { folderKey: true },
        distinct: ["folderKey"],
        orderBy: { folderKey: "asc" },
    });
    return NextResponse.json(keys.map((k) => k.folderKey));
}
