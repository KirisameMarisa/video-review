"use client";

import { useMemo, useRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { FolderRoot, Pencil } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { FolderSection } from "@/components/video-browser/sections/folder";
import { FolderHeaderButton, FolderHeaderField } from "@/components/video-browser/sections/folder/folder-header";
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

    // Reads this list back from the server. The browsing list catches up when the mode ends, or
    // here when Done was clicked while this rename was still saving.
    const finish = (target: string) => {
        reload()
            .catch((reason) => console.error(reason))
            .finally(() => close(target));
        if (!useVideoListStore.getState().organizing) {
            void useVideoStore.getState().reloadOnDataChange();
        }
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
        const open = openPaths.includes(folder.path);

        return (
            <FolderSection
                key={folder.path}
                depth={depth}
                open={open}
                onToggle={() => toggleFolder(folder.path, false)}
                header={editing ? (
                    <FolderHeaderField open={open}>
                        <RenameInput renamer={folderRenamer(folder, siblings)} onRenamed={() => finish(target)} onCancelled={() => close(target)} />
                    </FolderHeaderField>
                ) : (
                    <>
                        <FolderHeaderButton
                            {...renameShortcuts(() => setRenaming(target))}
                            names={folder.names}
                            path={folder.path}
                            open={open}
                            total={folder.allVideos.length}
                        />
                        <SidebarMenuAction showOnHover title={t("rename.action")} onClick={() => setRenaming(target)}>
                            <Pencil />
                        </SidebarMenuAction>
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
