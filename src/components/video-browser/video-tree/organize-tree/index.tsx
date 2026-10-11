"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FolderRoot } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { VideoTree } from "@/components/video-browser/video-tree";
import { FolderHeaderButton, FolderHeaderField } from "@/components/video-browser/video-tree/folder/folder-header";
import type { FolderNode } from "@/components/video-browser/video-tree/folder-tree";
import { useFolderList } from "@/components/video-browser/video-tree/use-folder-list";
import { OrganizeRowButton, OrganizeRowField, RenameAction } from "@/components/video-browser/video-tree/organize-tree/row";
import { RenameInput } from "@/components/controls/rename-input";
import { folderRow, videoRow } from "@/components/video-browser/video-tree/organize-tree/row-keys";
import { useAllVideos } from "@/components/video-browser/video-tree/organize-tree/hooks/use-all-videos";
import { useFolderDrop } from "@/components/video-browser/video-tree/organize-tree/hooks/use-folder-drop";
import { useRenaming } from "@/components/video-browser/video-tree/organize-tree/hooks/use-renaming";
import { useSelection } from "@/components/video-browser/video-tree/organize-tree/hooks/use-selection";
import { useVideoListStore } from "@/stores/video-list-store";
import { useVideoStore } from "@/stores/video-store";

// The list in organize mode: every folder on its own row, under a row for the top level.
export function OrganizeList() {
    const t = useTranslations("video-list-panel.organize");
    const containerRef = useRef<HTMLDivElement>(null);
    const { videos, reload } = useAllVideos();
    // Every folder gets its own row, so each one can be dropped on and renamed.
    const folderList = useFolderList(videos, { compact: false });
    const { reveal } = folderList;

    // The browsing list catches up when the mode ends, or here if it ended while saving.
    const readBack = () => {
        const reading = reload().catch((reason) => console.error(reason));
        if (!useVideoListStore.getState().organizing) {
            void useVideoStore.getState().reloadOnDataChange();
        }
        return reading;
    };

    const { pickRow, pickHeader, dragged, clear } = useSelection(folderList, videos);

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
            <SidebarMenuItem>
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

    const renderHeader = (folder: FolderNode, open: boolean, siblings: FolderNode[]) => {
        const key = folderRow(folder.path);

        if (editing(key)) {
            return (
                <FolderHeaderField open={open}>
                    <RenameInput {...renameFolder(folder, siblings)} />
                </FolderHeaderField>
            );
        }

        return (
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
        );
    };

    return (
        <VideoTree folders={folderList} containerRef={containerRef} slot="organize-list" header={renderHeader} row={renderRow}>
            <SidebarMenuItem>
                <SidebarMenuButton {...dropOnTop()}>
                    <FolderRoot className="text-primary" />
                    <span>{t("top")}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </VideoTree>
    );
}
