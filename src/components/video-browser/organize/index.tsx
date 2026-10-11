"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { FolderRoot } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { FolderSection } from "@/components/video-browser/sections/folder";
import { FolderHeaderButton, FolderHeaderField } from "@/components/video-browser/sections/folder/folder-header";
import { buildNestedFolders, folderAncestors, type FolderNode } from "@/components/video-browser/sections/folder-tree";
import { OrganizeRowButton, OrganizeRowField, RenameAction } from "@/components/video-browser/organize/row";
import { RenameInput } from "@/components/controls/rename-input";
import { folderRow, videoRow } from "@/components/video-browser/organize/row-keys";
import { useAllVideos } from "@/components/video-browser/organize/hooks/use-all-videos";
import { useFolderDrop } from "@/components/video-browser/organize/hooks/use-folder-drop";
import { useRenaming } from "@/components/video-browser/organize/hooks/use-renaming";
import { useSelection } from "@/components/video-browser/organize/hooks/use-selection";
import { useVideoListStore } from "@/stores/video-list-store";
import { useVideoStore } from "@/stores/video-store";

// The list in organize mode: every folder on its own row, under a row for the top level.
export function OrganizeList() {
    const t = useTranslations("video-list-panel.organize");
    const containerRef = useRef<HTMLDivElement>(null);
    const { videos, reload } = useAllVideos();
    const openPaths = useVideoListStore((s) => s.openPaths);
    const toggleFolder = useVideoListStore((s) => s.toggleFolder);
    const revealFolders = useVideoListStore((s) => s.revealFolders);

    const root = useMemo(() => buildNestedFolders(videos, { compact: false }), [videos]);

    const reveal = (path: string) => revealFolders(folderAncestors(path));

    // The browsing list catches up when the mode ends, or here if it ended while saving.
    const readBack = () => {
        const reading = reload().catch((reason) => console.error(reason));
        if (!useVideoListStore.getState().organizing) {
            void useVideoStore.getState().reloadOnDataChange();
        }
        return reading;
    };

    const { pickRow, pickHeader, dragged, clear } = useSelection(root, videos);

    // A renamed folder's key is stale, and so would be those of everything picked inside it.
    const { editing, start, renameOn, renameVideo, renameFolder } = useRenaming(videos, () => {
        clear();
        return readBack();
    });

    // Opens where it went, so the moved video or folder is in view.
    const { dragFrom, dropOn, dropOnTop, target: dropTarget } = useFolderDrop({
        reveal,
        onMoved: (path) => {
            clear();
            reveal(path);
            void readBack();
        },
    });

    const renderRow = (video: VideoWithRevision) => {
        const key = videoRow(video.id);

        return (
            <SidebarMenuItem key={video.id}>
                {editing(key) ? (
                    <OrganizeRowField video={video} containerRef={containerRef}>
                        <RenameInput {...renameVideo(video)} />
                    </OrganizeRowField>
                ) : (
                    <>
                        <OrganizeRowButton
                            {...renameOn(key)}
                            {...pickRow(key)}
                            {...dragFrom(dragged(key, { video }))}
                            {...dropOn(video.folderKey)}
                            video={video}
                            containerRef={containerRef}
                        />
                        <RenameAction onClick={() => start(key)} />
                    </>
                )}
            </SidebarMenuItem>
        );
    };

    const renderFolder = (folder: FolderNode, depth: number, siblings: FolderNode[]) => {
        const key = folderRow(folder.path);
        const open = openPaths.includes(folder.path);

        return (
            <FolderSection
                key={folder.path}
                depth={depth}
                open={open}
                onToggle={() => toggleFolder(folder.path, false)}
                header={editing(key) ? (
                    <FolderHeaderField open={open}>
                        <RenameInput {...renameFolder(folder, siblings)} />
                    </FolderHeaderField>
                ) : (
                    <>
                        <FolderHeaderButton
                            {...renameOn(key)}
                            {...pickHeader(key)}
                            {...dragFrom(dragged(key, { folderPath: folder.path }))}
                            {...dropOn(folder.path)}
                            data-drop-target={dropTarget === folder.path}
                            names={folder.names}
                            path={folder.path}
                            open={open}
                            total={folder.allVideos.length}
                        />
                        <RenameAction onClick={() => start(key)} />
                    </>
                )}
            >
                {folder.folders.map((child) => renderFolder(child, depth + 1, folder.folders))}
                {folder.videos.map(renderRow)}
            </FolderSection>
        );
    };

    return (
        <div ref={containerRef} data-slot="organize-list" className="min-h-0 flex-1 overflow-y-auto">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton {...dropOnTop()}>
                        <FolderRoot className="text-primary" />
                        <span>{t("top")}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {root.folders.map((folder) => renderFolder(folder, 0, root.folders))}
                {root.videos.map(renderRow)}
            </SidebarMenu>
        </div>
    );
}
