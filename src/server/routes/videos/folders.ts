import { prisma } from "@/server/lib/db";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";

export const foldersRouter = new Hono();

foldersRouter.openapi({
    method: "get",
    summary: "Get all folder keys",
    description: "Returns a list of all unique folder keys from the database.",
    path: "/",
    responses: {
        200: {
            description: "List of folder keys",
        },
        500: {
            description: "Internal Server Error",
        },
    },
},
async (c) => {
    try {
        const keys = await prisma.video.findMany({
            select: { folderKey: true },
            distinct: ["folderKey"],
            orderBy: { folderKey: "asc" },
        });
        return c.json(keys.map((k) => k.folderKey));
    } catch {
        return c.json({ error: "Failed to fetch folders" }, { status: 500 });
    }
});
