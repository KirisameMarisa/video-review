export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { getSession } from "@/lib/upload-session";
import { prisma } from "@/lib/prisma";
import { VideoReviewStorage } from "@/lib/storage";

export async function GET(req: Request): Promise<Response> {
    try {
        authorize(req, ["admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        }
        return apiError("unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
        return apiError("missing session_id", 400);
    }

    const session = await getSession(session_id);
    if (session) {
        const hasObject = await VideoReviewStorage.hasObject(session.storage);
        const status = hasObject ? "progress" : "uploaded";
        return NextResponse.json({
            status: status,
            nextRev: session.nextRev,
            title: session.title,
            folderKey: session.folderKey,
        });
    }

    const revision = await prisma.videoRevision.findFirst({
        where: { id: session_id },
    });

    if (revision) {
        return NextResponse.json({
            status: "completed",
            revisionId: revision.id,
            videoId: revision.videoId,
            revision: revision.revision,
        });
    }

    return NextResponse.json(
        { status: "not_found" },
        { status: 404 }
    );
}
