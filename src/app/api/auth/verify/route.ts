import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    const { token } = await req.json();
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        return NextResponse.json({ valid: true, decoded });
    } catch {
        return NextResponse.json({ valid: false }, { status: 401 });
    }
}
