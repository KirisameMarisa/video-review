export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { authorize, JwtError } from "@/lib/jwt";
import { deleteSession, getSession } from "@/lib/upload-session";

export async function POST(req: Request): Promise<Response> {
    try {
        authorize(req, ["viewer", "admin", "guest"]);
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
    if (!session) {
        return apiError("missing session", 400);
    }

    const storageKey = session.storageKey;

    await deleteSession(session_id);
    return NextResponse.json(
        { filePath: storageKey },
        { status: 200 }
    );
}
