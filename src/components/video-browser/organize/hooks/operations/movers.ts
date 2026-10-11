import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import type { VideoWithRevision } from "@/lib/db-types";
import { useVideoListStore } from "@/stores/video-list-store";

// What is being dragged: a video, or a folder by its path.
export type MoveSource = { video: VideoWithRevision } | { folderPath: string };

// The body of POST /videos/move.
export type MoveRequest = { videos: { id: string; folderKey: string }[]; folders: { from: string; to: string }[] };

// The folder path for the top level, where only folders can go: videos always live in a folder.
export const TOP = "";

const isIn = (key: string, folder: string) => key === folder || key.startsWith(`${folder}/`);

// The request for dropping the sources on `path`, or null to refuse the drop. The move is all or
// nothing, so one source that can't go there refuses them all.
export function planMove(sources: MoveSource[], path: string): MoveRequest | null {
    const request: MoveRequest = { videos: [], folders: [] };

    // What is inside a picked folder goes with it, so it stays where it is when the folder does.
    const folders = sources.flatMap((s) => "folderPath" in s ? [s.folderPath] : []);
    const inPicked = (key: string, self?: string) => folders.some((f) => f !== self && isIn(key, f));
    const outermost = sources.filter((s) => "video" in s
        ? !inPicked(s.video.folderKey)
        : !inPicked(s.folderPath, s.folderPath));

    for (const source of outermost) {
        if ("video" in source) {
            if (path === TOP) {
                return null;
            }

            if (path !== source.video.folderKey) {
                request.videos.push({ id: source.video.id, folderKey: path });
            }
            continue;
        }

        const from = source.folderPath;
        if (path !== TOP && isIn(path, from)) {
            return null;
        }

        const slash = from.lastIndexOf("/");
        const parent = slash < 0 ? TOP : from.slice(0, slash);
        const name = from.slice(slash + 1);
        if (path !== parent) {
            request.folders.push({ from, to: path === TOP ? name : `${path}/${name}` });
        }
    }

    return request.videos.length + request.folders.length === 0 ? null : request;
}

// How organize mode moves videos and folders: the request, and how a refusal reads.
export function useMovers() {
    const t = useTranslations("video-list-panel.organize.move");
    const renameFolderPaths = useVideoListStore((s) => s.renameFolderPaths);

    // Sends a planMove() result and returns a reason it was refused, or null once it is moved.
    const move = async (request: MoveRequest): Promise<string | null> => {
        try {
            const res = await api.videos.move.$post({ json: request });
            if (res.status === 409) {
                const { titles } = await res.json();
                return `${t("clash")}: ${titles.join(", ")}`;
            }
            if (res.status !== 200) {
                return `${t("failed")}: ${await readError(res)}`;
            }
        } catch (e) {
            return `${t("failed")}: ${e instanceof Error ? e.message : String(e)}`;
        }

        // A moved folder stays open, with the folders under it, as after a rename.
        for (const folder of request.folders) {
            renameFolderPaths(folder.from, folder.to);
        }
        return null;
    };

    return { move };
}
