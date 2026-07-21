import { Hono } from "hono";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';

export const oldUploadRouter = new Hono();

oldUploadRouter.post('/', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get("file") as File | null;
        const savePath = formData.get("path") as string;

        // Reject missing or non-image payloads early.
        if (!file) {
            return c.json({ error: "missing file" }, { status: 400 });
        }

        if (!file.type.startsWith("image/")) {
            return c.json({ error: "invalid file type" }, { status: 400 });
        }

        // Write to a temporary file first, then move into final storage path.
        // This avoids exposing partially written files if upload/write fails.
        const tmpDir = path.join(process.cwd(), "uploads", "tmp");
        fs.promises.mkdir(tmpDir, { recursive: true });

        const tmpFilePath = path.join(tmpDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.promises.writeFile(tmpFilePath, buffer);

        const storageKey = savePath ? savePath : `drawing/${uuidv4()}.png`;
        const fullPath = path.join(process.cwd(), "uploads", storageKey);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.rename(tmpFilePath, fullPath);

        console.log("Drawing image uploaded to storage key:", storageKey);
        console.log("Temporary file path:", tmpFilePath);
        console.log("File exists after upload:", fs.existsSync(tmpFilePath));
        console.log("File size after upload:", fs.existsSync(tmpFilePath) ? fs.statSync(tmpFilePath).size : "N/A");

        if (fs.existsSync(tmpFilePath)) {
            fs.rmSync(tmpFilePath);
        }

        return c.json(
            { filePath: storageKey },
            { status: 200 }
        );

    } catch {
        return c.json({ error: "failed to upload drawing image" }, { status: 500 });
    }
});
