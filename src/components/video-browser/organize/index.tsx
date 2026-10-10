"use client";

import { useMemo, useRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { FolderRoot, Pencil } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { FolderSection } from "@/components/video-browser/sections/folder";
import { buildNestedFolders, type FolderNode } from "@/components/video-browser/sections/folder-tree";
import { OrganizeRow } from "@/components/video-browser/organize/row";
import { RenameInput } from "@/components/controls/rename-input";
import { isRenameShortcut, useRenamers } from "@/components/video-browser/organize/renamers";
import { useAllVideos } from "@/components/video-browser/organize/use-all-videos";
import { useVideoListStore } from "@/stores/video-list-store";
import { useVideoStore } from "@/stores/video-store";

// The list in organize mode: every folder on its own row, under a row for the top level.
export function OrganizeList() {
    const t = useTranslations("video-list-panel.organize");
    const containerRef = useRef<HTMLDivElement>(null);
    const { videos, reload } = useAllVideos();
    const openPaths = useVideoListStore((s) => s.openPaths);
    const toggleFolder = useVideoListStore((s) => s.toggleFolder);
    // Which row is being renamed, as "video:<id>" or "folder:<path>".
    const [renaming, setRenaming] = useState<string | null>(null);

    const { videoRenamer, folderRenamer } = useRenamers(videos);

    const root = useMemo(() => buildNestedFolders(videos, { compact: false }), [videos]);

    const renameShortcuts = (start: () => void): ComponentProps<"button"> => ({
        onKeyDown: (e) => {
            if (isRenameShortcut(e)) {
                e.preventDefault();
                start();
            }
        },
    });

    // Closes only the rename it was given: clicking another row's pencil commits the first rename,
    // whose save may end after the second one has opened.
    const close = (target: string) => setRenaming((current) => current === target ? null : current);

    // Reads the result back from the server: this list, then the browsing list and the open video.
    const finish = (target: string) => {
        reload()
            .catch((reason) => console.error(reason))
            .finally(() => close(target));
        void useVideoStore.getState().reloadOnDataChange();
    };

    const renderRow = (video: VideoWithRevision) => {
        const target = `video:${video.id}`;
        const editing = renaming === target;

        return (
            <OrganizeRow
                key={video.id}
                video={video}
                containerRef={containerRef}
                buttonProps={renameShortcuts(() => setRenaming(target))}
                onRename={() => setRenaming(target)}
                replacement={editing && (
                    <RenameInput renamer={videoRenamer(video)} onRenamed={() => finish(target)} onCancelled={() => close(target)} />
                )}
            />
        );
    };

    const renderFolder = (folder: FolderNode, depth: number, siblings: FolderNode[]) => {
        const target = `folder:${folder.path}`;
        const editing = renaming === target;

        return (
            <FolderSection
                key={folder.path}
                names={folder.names}
                path={folder.path}
                depth={depth}
                open={openPaths.includes(folder.path)}
                total={folder.allVideos.length}
                onToggle={() => toggleFolder(folder.path, false)}
                buttonProps={renameShortcuts(() => setRenaming(target))}
                action={(
                    <SidebarMenuAction showOnHover title={t("rename.action")} onClick={() => setRenaming(target)}>
                        <Pencil />
                    </SidebarMenuAction>
                )}
                replacement={editing && (
                    <RenameInput renamer={folderRenamer(folder, siblings)} onRenamed={() => finish(target)} onCancelled={() => close(target)} />
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
                    <SidebarMenuButton>
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
