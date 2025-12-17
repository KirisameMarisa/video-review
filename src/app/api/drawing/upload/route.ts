import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/drawing/upload:
 *   post:
 *     summary: Upload drawing image
 *     description: >
 *       Uploads an image file and saves it to the drawing uploads directory.
 *       If path is not specified, a new file is created with a generated name.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               path:
 *                 type: string
 *                 description: Optional save path
 *     responses:
 *       200:
 *         description: Upload succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 filePath:
 *                   type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to upload drawing image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const savePath = formData.get("path") as string;

        // 400
        if (!file) {
            return apiError("missing file", 400);
        }

        if (!file.type.startsWith("image/")) {
            return apiError("invalid file type", 400);
        }

        // 保存先決定
        let filename = "";
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

        return NextResponse.json(
            { filePath: `/api/uploads/drawing/${filename}` },
            { status: 200 }
        );

    } catch {
        return apiError("failed to upload drawing image", 500);
    }
}
