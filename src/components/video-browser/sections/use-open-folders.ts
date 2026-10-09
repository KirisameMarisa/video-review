import { useCallback, useEffect } from "react";
import { folderAncestors } from "@/components/video-browser/sections/folder-tree";
import { useVideoListStore } from "@/stores/video-list-store";

export function useOpenFolders(filtering: boolean) {
    const openPaths = useVideoListStore((s) => s.openPaths);
    const closedWhileFiltering = useVideoListStore((s) => s.closedWhileFiltering);
    const toggleFolder = useVideoListStore((s) => s.toggleFolder);
    const revealFolders = useVideoListStore((s) => s.revealFolders);
    const clearClosedWhileFiltering = useVideoListStore((s) => s.clearClosedWhileFiltering);

    useEffect(() => {
        clearClosedWhileFiltering();
    }, [filtering, clearClosedWhileFiltering]);

    const isOpen = (path: string) =>
        filtering ? !closedWhileFiltering.includes(path) : openPaths.includes(path);

    const toggle = (path: string) => toggleFolder(path, filtering);

    const reveal = useCallback((folderKey: string) => revealFolders(folderAncestors(folderKey)), [revealFolders]);

    return { isOpen, toggle, reveal };
}
