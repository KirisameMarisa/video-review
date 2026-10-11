import { createRoute, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

// Drops empty segments and the spaces around them, so "/a//b/" and "a / b" both mean "a/b".
const folderKey = z.string()
    .transform(s => s.split("/").map(part => part.trim()).filter(Boolean).join("/"))
    .pipe(z.string().min(1));

const BodySchema = z.object({
    videos: z.array(z.object({ id: z.string().min(1), folderKey })).default([]),
    // Every video in the folder and the folders under it moves, keeping the shape below it.
    folders: z.array(z.object({ from: folderKey, to: folderKey })).default([]),
});

const isIn = (key: string, folder: string) => key === folder || key.startsWith(`${folder}/`);

export const moveRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Move videos and folders",
        description: [
            "Moves videos to other folders and folders under other folders in one go: either everything moves or nothing does.",
            "A video inside a folder that is also being moved goes with its folder.",
            "Uploads that still send the old folder key create new videos.",
        ].join(" "),
        path: "/",
        request: {
            body: {
                required: true,
                content: { "application/json": { schema: BodySchema } },
            },
        },
        responses: {
            200: {
                description: "Everything was moved",
                content: { "application/json": { schema: z.object({ moved: z.number() }) } },
            },
            400: errorResponse("Nothing to move, or a folder would move into itself, to two places, or into a folder that is also moving"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("A video or folder to move does not exist"),
            409: {
                description: "Videos would end up with the same title in the same folder; nothing was moved",
                content: { "application/json": { schema: z.object({ error: z.string(), titles: z.array(z.string()) }) } },
            },
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);
        const body = c.req.valid("json");

        if (body.videos.length === 0 && body.folders.length === 0) {
            return c.json({ error: "nothing to move" }, 400);
        }

        // The same folder twice is one move; to two places, a mistake.
        const targets = new Map<string, string>();
        for (const f of body.folders) {
            if ((targets.get(f.from) ?? f.to) !== f.to) {
                return c.json({ error: "a folder cannot move to two places" }, 400);
            }
            targets.set(f.from, f.to);
        }

        // A folder sent where it already is stays, as a video does.
        const requested = [...targets].filter(([from, to]) => from !== to).map(([from, to]) => ({ from, to }));

        // A folder inside another folder that moves goes with it, as do the videos in either.
        const folders = requested.filter(f => !requested.some(other => other.from !== f.from && isIn(f.from, other.from)));
        const leaving = (key: string) => folders.some(f => isIn(key, f.from));

        // Deleted videos count too: they move with their folder like the rest.
        const all = await prisma.video.findMany({ select: { id: true, folderKey: true, title: true } });
        const byId = new Map(all.map(v => [v.id, v]));

        if (body.videos.some(v => !byId.has(v.id)) || folders.some(f => !all.some(v => isIn(v.folderKey, f.from)))) {
            return c.json({ error: "a video or folder to move does not exist" }, 404);
        }

        const videos = body.videos.filter(v => !leaving(byId.get(v.id)!.folderKey));

        // Nothing may land in a folder that is moving away, itself included, or part of it would
        // stay behind.
        if (folders.some(f => leaving(f.to)) || videos.some(v => leaving(v.folderKey))) {
            return c.json({ error: "cannot move into a folder that is also moving" }, 400);
        }

        // Where each video ends up: with its folder if that moves, otherwise where it was sent.
        const destination = new Map<string, string>();
        for (const v of all) {
            const folder = folders.find(f => isIn(v.folderKey, f.from));
            if (folder) {
                destination.set(v.id, folder.to + v.folderKey.slice(folder.from.length));
            }
        }
        for (const v of videos) {
            destination.set(v.id, v.folderKey);
        }

        // Uploads find their video by title and folder, so no two videos may share the pair afterwards.
        const place = (folderKey: string, title: string) => JSON.stringify([folderKey, title]);
        const placed = new Map<string, number>();
        for (const v of all) {
            const key = place(destination.get(v.id) ?? v.folderKey, v.title);
            placed.set(key, (placed.get(key) ?? 0) + 1);
        }
        const clashes = all.filter(v => destination.has(v.id) && placed.get(place(destination.get(v.id)!, v.title))! > 1);
        if (clashes.length > 0) {
            const titles = [...new Set(clashes.map(v => v.title))];
            return c.json({ error: "videos would share a title in the same folder", titles }, 409);
        }

        const moves = [...destination].filter(([id, to]) => byId.get(id)!.folderKey !== to);
        await prisma.$transaction(moves.map(([id, to]) => prisma.video.update({
            where: { id },
            data: { folderKey: to },
        })));

        return c.json({ moved: moves.length }, 200);
    });
