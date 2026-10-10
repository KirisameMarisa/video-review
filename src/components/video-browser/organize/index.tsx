"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { FolderRoot } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { buildNestedFolders, type FolderNode } from "@/components/video-browser/sections/folder-tree";
import { FolderSection } from "@/components/video-browser/sections/folder";
import { OrganizeRow } from "@/components/video-browser/organize/row";
import { useAllVideos } from "@/components/video-browser/organize/use-all-videos";
import { useVideoListStore } from "@/stores/video-list-store";

// The list in organize mode: every folder on its own row, under a row for the top level.
export function OrganizeList() {
    const t = useTranslations("video-list-panel.organize");
    const containerRef = useRef<HTMLDivElement>(null);
    const { videos } = useAllVideos();
    const openPaths = useVideoListStore((s) => s.openPaths);
    const toggleFolder = useVideoListStore((s) => s.toggleFolder);

    const root = useMemo(() => buildNestedFolders(videos, { compact: false }), [videos]);

    const renderRow = (video: VideoWithRevision) => (
        <OrganizeRow key={video.id} video={video} containerRef={containerRef} />
    );

    const renderFolder = (folder: FolderNode, depth: number) => (
        <FolderSection
            key={folder.path}
            names={folder.names}
            path={folder.path}
            depth={depth}
            open={openPaths.includes(folder.path)}
            total={folder.allVideos.length}
            onToggle={() => toggleFolder(folder.path, false)}
        >
            {folder.folders.map((child) => renderFolder(child, depth + 1))}
            {folder.videos.map(renderRow)}
        </FolderSection>
    );

    return (
        <div ref={containerRef} data-slot="organize-list" className="min-h-0 flex-1 overflow-y-auto">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton>
                        <FolderRoot className="text-primary" />
                        <span>{t("top")}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {root.folders.map((folder) => renderFolder(folder, 0))}
                {root.videos.map(renderRow)}
            </SidebarMenu>
        </div>
    );
}
