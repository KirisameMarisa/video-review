"use client";

import { useTranslations } from "next-intl";
import { FolderRoot } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { VideoTree } from "@/components/video-browser/video-tree";
import { VideoItemField } from "@/components/video-browser/video-tree/nodes/item/video-item";
import { FolderHeaderButton, FolderHeaderField } from "@/components/video-browser/video-tree/nodes/folder/folder-header";
import type { FolderNode } from "@/components/video-browser/video-tree/folder-tree";
import { useFolderList } from "@/components/video-browser/video-tree/use-folder-list";
import { OrganizeItemButton, RenameAction } from "@/components/video-browser/video-tree/organize-tree/item";
import { RenameInput } from "@/components/controls/rename-input";
import { folderNodeKey, itemNodeKey } from "@/components/video-browser/video-tree/organize-tree/node-keys";
import { useAllVideos } from "@/components/video-browser/video-tree/organize-tree/hooks/use-all-videos";
import { useFolderDrop } from "@/components/video-browser/video-tree/organize-tree/hooks/use-folder-drop";
import { useRenaming } from "@/components/video-browser/video-tree/organize-tree/hooks/use-renaming";
import { useSelection } from "@/components/video-browser/video-tree/organize-tree/hooks/use-selection";
import { useVideoListStore } from "@/stores/video-list-store";
import { useVideoStore } from "@/stores/video-store";

// The tree in organize mode: every folder as its own node, under the Top node.
export function OrganizeTree() {
    const t = useTranslations("video-list-panel.organize");
    const { videos, reload } = useAllVideos();
    // Every folder gets its own node, so each one can be dropped on and renamed.
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

    const { pickItem, pickFolder, dragged, clear } = useSelection(folderList, videos);

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

    const renderItem = (video: VideoWithRevision) => {
        const key = itemNodeKey(video.id);

        return (
            <SidebarMenuItem>
                {editing(key) ? (
                    <VideoItemField video={video}>
                        <RenameInput {...renameVideo(video)} />
                    </VideoItemField>
                ) : (
                    <>
                        <OrganizeItemButton
                            {...renameOn(key)}
                            {...pickItem(key)}
                            {...dragFrom(dragged(key, { video }))}
                            {...dropOn(video.folderKey)}
                            video={video}
                        />
                        <RenameAction onClick={() => start(key)} />
                    </>
                )}
            </SidebarMenuItem>
        );
    };

    const renderHeader = (folder: FolderNode, open: boolean, siblings: FolderNode[]) => {
        const key = folderNodeKey(folder.path);

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
                    {...pickFolder(key)}
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
        <VideoTree folders={folderList} slot="organize-tree" header={renderHeader} item={renderItem}>
            <SidebarMenuItem>
                <SidebarMenuButton {...dropOnTop()}>
                    <FolderRoot className="text-primary" />
                    <span>{t("top")}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </VideoTree>
    );
}
