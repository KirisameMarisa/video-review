import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: pathSegments } = await params;
    const filePath = path.join(process.cwd(), "uploads", ...pathSegments);
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
        case ".mp4":
            {
                const stat = await fs.promises.stat(filePath);
                const fileSize = stat.size;
                const range = req.headers.get("range");

                if (!range) {
                    // 通常の全体送信
                    const file = await fs.promises.readFile(filePath);
                    return new NextResponse(new Uint8Array(file), {
                        headers: {
                            "Content-Type": "video/mp4",
                            "Content-Length": fileSize.toString(),
                        },
                    });
                }

                // Range ヘッダー解析
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                const chunkSize = end - start + 1;
                const stream = fs.createReadStream(filePath, { start, end });

                return new NextResponse(stream as any, {
                    status: 206,
                    headers: {
                        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                        "Accept-Ranges": "bytes",
                        "Content-Length": chunkSize.toString(),
                        "Content-Type": "video/mp4",
                    },
                });
            }
        default:
            {
                const data = await fs.promises.readFile(filePath);
                const ext = path.extname(filePath).toLowerCase();
                let mime = ""
                switch (ext) {
                    case ".png": mime = "image/png"; break;
                    case ".jpg": case ".jpeg": mime = "image/jpeg"; break;
                }
                return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": mime } });
            }
    }
}
