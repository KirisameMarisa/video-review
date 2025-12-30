import { prisma } from "@/server/lib/db";
import { Hono } from "hono";

export const foldersRouter = new Hono();

foldersRouter.get('/', async (c) => {
    const keys = await prisma.video.findMany({
        select: { folderKey: true },
        distinct: ["folderKey"],
        orderBy: { folderKey: "asc" },
    });
    console.log(keys);
    return c.json(keys.map((k) => k.folderKey));
});