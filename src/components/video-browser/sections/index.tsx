"use client";

import { useEffect, useRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu } from "@/components/ui/sidebar";
import { Marks } from "@/components/video-browser/marks/marks";
import type { MarkContext } from "@/components/video-browser/marks/use-mark-context";
import { FolderSection } from "@/components/video-browser/sections/folder";
import { VideoRow } from "@/components/video-browser/sections/video-row";
import type { FolderNode } from "@/components/video-browser/sections/folder-tree";
import type { FolderList } from "@/components/video-browser/sections/use-folder-list";

type Props = {
    folderList: FolderList;
    markContext: MarkContext;
    selectedVideoId: string | null;
    onSelectVideo: (videoId: string) => void;
};

export function VideoSections({ folderList, markContext, selectedVideoId, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef(new Map<string, HTMLButtonElement>());
    const { root, isOpen, toggle, reveal } = folderList;

    // A video opened from elsewhere (URL, auto-play next, upload) is revealed and scrolled to.
    useEffect(() => {
        const video = root.allVideos.find((v) => v.id === selectedVideoId);
        if (!video) {
            return;
        }

        reveal(video.folderKey);
        requestAnimationFrame(() => {
            rowRefs.current.get(video.id)?.scrollIntoView({ block: "nearest" });
        });
    }, [selectedVideoId, root, reveal]);

    const renderRow = (video: VideoWithRevision, depth: number) => (
        <VideoRow
            key={video.id}
            ref={(el) => {
                if (el) {
                    rowRefs.current.set(video.id, el);
                } else {
                    rowRefs.current.delete(video.id);
                }
            }}
            video={video}
            selected={video.id === selectedVideoId}
            marks={<Marks videos={[video]} scope="video" context={markContext} />}
            depth={depth}
            containerRef={containerRef}
            onSelect={onSelectVideo}
        />
    );

    // Each folder wraps its contents, so its sticky header leaves together with them.
    const renderFolder = (folder: FolderNode, depth: number) => (
        <FolderSection
            key={folder.path}
            names={folder.names}
            path={folder.path}
            depth={depth}
            open={isOpen(folder.path)}
            total={folder.allVideos.length}
            marks={<Marks videos={folder.allVideos} scope="folder" context={markContext} />}
            onToggle={() => toggle(folder.path)}
        >
            {folder.folders.map((child) => renderFolder(child, depth + 1))}
            {folder.videos.map((video) => renderRow(video, depth + 1))}
        </FolderSection>
    );

    return (
        <div ref={containerRef} data-slot="video-sections" className="min-h-0 flex-1 overflow-y-auto">
            <SidebarMenu>
                {root.folders.map((folder) => renderFolder(folder, 0))}
                {root.videos.map((video) => renderRow(video, 0))}
            </SidebarMenu>
        </div>
    );
}
