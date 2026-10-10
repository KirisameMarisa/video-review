"use client";

import { useMemo, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { FolderRoot } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { FolderSection } from "@/components/video-browser/sections/folder";
import { FolderHeaderButton, FolderHeaderField } from "@/components/video-browser/sections/folder/folder-header";
import { buildNestedFolders, folderAncestors, type FolderNode } from "@/components/video-browser/sections/folder-tree";
import { OrganizeRowButton, OrganizeRowField } from "@/components/video-browser/organize/row";
import { RenameAction } from "@/components/video-browser/organize/rename-action";
import { RenameInput } from "@/components/controls/rename-input";
import { isRenameShortcut, useRenamers } from "@/components/video-browser/organize/operations/renamers";
import { useAllVideos } from "@/components/video-browser/organize/use-all-videos";
import { useFolderDrop } from "@/components/video-browser/organize/use-folder-drop";
import { TOP, type MoveSource } from "@/components/video-browser/organize/operations/movers";
import { isPickClick, useSelection } from "@/components/video-browser/organize/use-selection";
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
    // Which row is being renamed, as "video:<id>" or "folder:<path>".
    const [renaming, setRenaming] = useState<string | null>(null);

    const { videoRenamer, folderRenamer } = useRenamers(videos);

    const reveal = (path: string) => revealFolders(folderAncestors(path));

    const root = useMemo(() => buildNestedFolders(videos, { compact: false }), [videos]);

    // Every row and folder as shown, top to bottom, for a Shift range.
    const order = useMemo(() => {
        const keys: string[] = [];
        const walk = (folder: FolderNode) => {
            keys.push(`folder:${folder.path}`);
            if (openPaths.includes(folder.path)) {
                folder.folders.forEach(walk);
                keys.push(...folder.videos.map((v) => `video:${v.id}`));
            }
        };
        root.folders.forEach(walk);
        keys.push(...root.videos.map((v) => `video:${v.id}`));
        return keys;
    }, [root, openPaths]);

    const { selected, click, clear } = useSelection(order);

    // Only what is in view moves, as in Finder: closing a folder leaves what was picked inside it.
    const pickedSources = useMemo(() => {
        const byId = new Map(videos.map((v) => [v.id, v]));
        const shown = new Set(order);
        return selected.filter((k) => shown.has(k)).flatMap((k): MoveSource[] => {
            if (k.startsWith("folder:")) {
                return [{ folderPath: k.slice("folder:".length) }];
            }

            const video = byId.get(k.slice("video:".length));
            return video ? [{ video }] : [];
        });
    }, [selected, videos, order]);

    // Dragging a picked row takes everything picked along; any other row goes alone.
    const dragged = (key: string, alone: MoveSource): MoveSource[] => selected.includes(key) ? pickedSources : [alone];

    // Shift+click would also select the page's text between the clicks.
    const pickOnClick = (onClick: (e: MouseEvent<HTMLButtonElement>) => void): ComponentProps<"button"> => ({
        onMouseDown: (e) => {
            if (e.shiftKey) {
                e.preventDefault();
            }
        },
        onClick,
    });

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

    // Reads this list back after a rename or move. The browsing list catches up when the mode
    // ends, or here when Done was clicked while the change was still saving.
    const readBack = () => {
        const reading = reload().catch((reason) => console.error(reason));
        if (!useVideoListStore.getState().organizing) {
            void useVideoStore.getState().reloadOnDataChange();
        }
        return reading;
    };

    // A renamed folder's key is stale, and so would be those of everything picked inside it.
    const finish = (target: string) => {
        clear();
        void readBack().finally(() => close(target));
    };

    // Opens where it went, so the moved video or folder is in view.
    const { dragFrom, dropOn, target: dropTarget } = useFolderDrop({
        reveal,
        onMoved: (path) => {
            clear();
            reveal(path);
            void readBack();
        },
    });

    const renderRow = (video: VideoWithRevision) => {
        const target = `video:${video.id}`;
        const editing = renaming === target;

        return (
            <SidebarMenuItem key={video.id}>
                {editing ? (
                    <OrganizeRowField video={video} containerRef={containerRef}>
                        <RenameInput renamer={videoRenamer(video)} onRenamed={() => finish(target)} onCancelled={() => close(target)} />
                    </OrganizeRowField>
                ) : (
                    <>
                        <OrganizeRowButton
                            {...renameShortcuts(() => setRenaming(target))}
                            {...pickOnClick((e) => click(target, e))}
                            {...dragFrom(dragged(target, { video }))}
                            data-selected={selected.includes(target)}
                            {...dropOn(video.folderKey)}
                            video={video}
                            containerRef={containerRef}
                        />
                        <RenameAction onClick={() => setRenaming(target)} />
                    </>
                )}
            </SidebarMenuItem>
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
                            {...pickOnClick((e) => {
                                // A plain click opens and closes the folder; picking leaves it as it is.
                                if (isPickClick(e)) {
                                    e.preventDefault();
                                    click(target, e);
                                }
                            })}
                            {...dragFrom(dragged(target, { folderPath: folder.path }))}
                            data-selected={selected.includes(target)}
                            {...dropOn(folder.path)}
                            data-drop-target={dropTarget === folder.path}
                            names={folder.names}
                            path={folder.path}
                            open={open}
                            total={folder.allVideos.length}
                        />
                        <RenameAction onClick={() => setRenaming(target)} />
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
                    <SidebarMenuButton {...dropOn(TOP)} data-drop-target={dropTarget === TOP}>
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
