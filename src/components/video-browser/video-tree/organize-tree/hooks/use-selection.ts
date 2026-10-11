import { useMemo, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { isMac } from "@/lib/platform";
import { visibleRows } from "@/components/video-browser/video-tree/folder-tree";
import type { FolderList } from "@/components/video-browser/video-tree/use-folder-list";
import type { MoveSource } from "@/components/video-browser/video-tree/organize-tree/hooks/operations/movers";
import { folderRow, parseRow, videoRow, type RowKey } from "@/components/video-browser/video-tree/organize-tree/row-keys";

type PickProps = ComponentProps<"button"> & { "data-selected": boolean };

// Shift picks a range; ⌘ on a Mac (where Ctrl+click is a right click), or Ctrl elsewhere, adds one.
const isPickClick = (e: MouseEvent) => e.shiftKey || (isMac() ? e.metaKey : e.ctrlKey);

// Rows and folders picked for moving, as in Explorer and Finder.
export function useSelection({ root, isOpen }: Pick<FolderList, "root" | "isOpen">, videos: VideoWithRevision[]) {
    const [selected, setSelected] = useState<RowKey[]>([]);
    // Where a Shift range starts: the last row clicked without Shift.
    const anchor = useRef<RowKey | null>(null);

    // Every row and folder as shown, top to bottom, for a Shift range.
    const order = useMemo(
        () => visibleRows(root, isOpen).map((row) => "folder" in row ? folderRow(row.folder.path) : videoRow(row.video.id)),
        [root, isOpen],
    );

    // Only what is in view moves, as in Finder: closing a folder leaves what was picked inside it.
    const pickedSources = useMemo(() => {
        const byId = new Map(videos.map((v) => [v.id, v]));
        const shown = new Set(order);
        return selected.filter((k) => shown.has(k)).flatMap((k): MoveSource[] => {
            const row = parseRow(k);
            if ("folderPath" in row) {
                return [row];
            }

            const video = byId.get(row.videoId);
            return video ? [{ video }] : [];
        });
    }, [selected, videos, order]);

    const pick = (key: RowKey, e: MouseEvent) => {
        if (e.shiftKey && anchor.current !== null && order.includes(anchor.current)) {
            const from = order.indexOf(anchor.current);
            const to = order.indexOf(key);
            setSelected(order.slice(Math.min(from, to), Math.max(from, to) + 1));
            return;
        }

        anchor.current = key;

        if (isPickClick(e)) {
            setSelected((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
        } else {
            setSelected([key]);
        }
    };

    const clear = () => {
        anchor.current = null;
        setSelected([]);
    };

    // Shift+click would also select the page's text between the clicks.
    const keepTextUnselected = (e: MouseEvent) => {
        if (e.shiftKey) {
            e.preventDefault();
        }
    };

    // Props for a video's row, where any click picks.
    const pickRow = (key: RowKey): PickProps => ({
        onMouseDown: keepTextUnselected,
        onClick: (e) => pick(key, e),
        "data-selected": selected.includes(key),
    });

    // Props for a folder's header, where a plain click opens and closes the folder instead.
    const pickHeader = (key: RowKey): PickProps => ({
        onMouseDown: keepTextUnselected,
        onClick: (e) => {
            if (isPickClick(e)) {
                e.preventDefault();
                pick(key, e);
            }
        },
        "data-selected": selected.includes(key),
    });

    // What dragging the row moves: everything picked if it is picked, otherwise only itself.
    const dragged = (key: RowKey, alone: MoveSource): MoveSource[] => {
        return selected.includes(key) ? pickedSources : [alone];
    };

    return { pickRow, pickHeader, dragged, clear };
}
