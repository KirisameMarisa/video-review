import { useState, type ComponentProps } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import type { FolderNode } from "@/components/video-browser/sections/folder-tree";
import { isRenameShortcut, useRenamers } from "@/components/video-browser/organize/hooks/operations/renamers";
import { folderRow, videoRow, type RowKey } from "@/components/video-browser/organize/row-keys";

// Which row is being renamed. The field stays until `afterRename` settles, so the old name
// doesn't flash back.
export function useRenaming(videos: VideoWithRevision[], afterRename: () => Promise<unknown>) {
    const { videoRenamer, folderRenamer } = useRenamers(videos);
    const [renaming, setRenaming] = useState<RowKey | null>(null);

    // Closes only the rename it was given: clicking another row's pencil commits the first rename,
    // whose save may end after the second one has opened.
    const close = (key: RowKey) => setRenaming((current) => current === key ? null : current);

    const editing = (key: RowKey) => renaming === key;

    const start = (key: RowKey) => setRenaming(key);

    // Props for the row's button: the keyboard shortcut that starts renaming it.
    const renameOn = (key: RowKey): ComponentProps<"button"> => ({
        onKeyDown: (e) => {
            if (isRenameShortcut(e)) {
                e.preventDefault();
                start(key);
            }
        },
    });

    const ends = (key: RowKey) => ({
        onRenamed: () => {
            void afterRename().finally(() => close(key));
        },
        onCancelled: () => close(key),
    });

    // Props for the RenameInput that takes the button's place.
    const renameVideo = (video: VideoWithRevision) => ({
        renamer: videoRenamer(video),
        ...ends(videoRow(video.id)),
    });

    const renameFolder = (folder: FolderNode, siblings: FolderNode[]) => ({
        renamer: folderRenamer(folder, siblings),
        ...ends(folderRow(folder.path)),
    });

    return { editing, start, renameOn, renameVideo, renameFolder };
}
