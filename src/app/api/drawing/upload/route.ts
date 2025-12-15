import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const savePath = formData.get("path") as string;

    if (!file) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // 保存先決定
    let filename = ""
    let filePath = "";
    if (!savePath) {
        const dir = path.join(process.cwd(), "uploads", "drawing");
        await fs.mkdir(dir, { recursive: true });
        filename = `${uuidv4()}.png`;
        filePath = path.join(dir, filename);
    } else {
        filePath = path.join(process.cwd(), savePath.replace("/api", ""));
        filename = path.parse(filePath).name + ".png";
    }

    // ファイル保存
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return NextResponse.json({
        filePath: `/api/uploads/drawing/${filename}`,
    });
}