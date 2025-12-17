import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * @swagger
 * /api/videos/folders:
 *   get:
 *     summary: Get all folder keys
 *     description: >
 *       Returns a list of all unique folder keys from the database.
 *     responses:
 *       200:
 *         description: List of folder keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
export async function GET() {
    const keys = await prisma.video.findMany({
        select: { folderKey: true },
        distinct: ["folderKey"],
        orderBy: { folderKey: "asc" },
    });
    return NextResponse.json(keys.map((k) => k.folderKey));
}
