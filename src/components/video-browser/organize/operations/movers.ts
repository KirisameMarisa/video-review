import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import type { VideoWithRevision } from "@/lib/db-types";
import { useVideoListStore } from "@/stores/video-list-store";

// What is being dragged: a video, or a folder by its path.
export type MoveSource = { video: VideoWithRevision } | { folderPath: string };

// The folder path for the top level, where only folders can go: videos always live in a folder.
export const TOP = "";

const isIn = (key: string, folder: string) => key === folder || key.startsWith(`${folder}/`);

// Where the source lands when dropped on the folder at `path`, or null when the drop is refused:
// a video on the top level, a folder into itself, or anything onto where it already is.
export function destination(source: MoveSource, path: string): string | null {
    if ("video" in source) {
        return path === TOP || path === source.video.folderKey ? null : path;
    }

    const from = source.folderPath;
    const slash = from.lastIndexOf("/");
    const parent = slash < 0 ? TOP : from.slice(0, slash);
    const name = from.slice(slash + 1);
    if (path === parent || (path !== TOP && isIn(path, from))) {
        return null;
    }

    return path === TOP ? name : `${path}/${name}`;
}

// How organize mode moves videos and folders: the request, and how a refusal reads.
export function useMovers() {
    const t = useTranslations("video-list-panel.organize.move");
    const renameFolderPaths = useVideoListStore((s) => s.renameFolderPaths);

    // Moves the source to `to`, a destination() result, and returns a reason it was refused, or
    // null once it is moved.
    const move = async (source: MoveSource, to: string): Promise<string | null> => {
        try {
            const res = await api.videos.move.$post({
                json: "video" in source
                    ? { videos: [{ id: source.video.id, folderKey: to }] }
                    : { folders: [{ from: source.folderPath, to }] },
            });
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
        if (!("video" in source)) {
            renameFolderPaths(source.folderPath, to);
        }
        return null;
    };

    return { move };
}
