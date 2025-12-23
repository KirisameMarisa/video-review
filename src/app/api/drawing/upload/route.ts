import { NextResponse } from "next/server";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { apiError } from "@/lib/api-response";
import { VideoReviewStorage } from "@/lib/storage";

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
        const tmpDir = path.join(process.cwd(), "uploads", "tmp");
        fsPromises.mkdir(tmpDir, { recursive: true });

        const tmpFilePath = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fsPromises.writeFile(tmpFilePath, buffer);

        const storageKey = savePath ? savePath : `drawing/${uuidv4()}.png`;
        const fullPath = path.join(process.cwd(), "uploads", storageKey);
        await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
        await fsPromises.rename(tmpFilePath, fullPath);

        console.log("Drawing image uploaded to storage key:", storageKey);
        console.log("Temporary file path:", tmpFilePath);
        console.log("File exists after upload:", fs.existsSync(tmpFilePath));
        console.log("File size after upload:", fs.existsSync(tmpFilePath) ? fs.statSync(tmpFilePath).size : "N/A");

        if(fs.existsSync(tmpFilePath)) {
            fs.rmSync(tmpFilePath);
        }

        return NextResponse.json(
            { filePath: storageKey },
            { status: 200 }
        );

    } catch {
        return apiError("failed to upload drawing image", 500);
    }
}
