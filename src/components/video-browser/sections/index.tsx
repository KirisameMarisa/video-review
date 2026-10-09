"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu } from "@/components/ui/sidebar";
import { FolderSection } from "@/components/video-browser/sections/folder-section";
import { VideoRow } from "@/components/video-browser/sections/video-row";
import {
    FolderNode,
    buildFlatFolders,
    buildNestedFolders,
    folderAncestors,
} from "@/components/video-browser/sections/utils";

const OPEN_SECTIONS_KEY = "videoSectionsOpen";

function loadOpenSections(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(OPEN_SECTIONS_KEY) ?? "[]"));
    } catch {
        return new Set();
    }
}

type Props = {
    videos: VideoWithRevision[];
    unReadVideoIds: string[];
    newSince: Date | null;
    selectedVideoId: string | null;
    expandAll: boolean;
    onSelectVideo: (videoId: string) => void;
};

export default function VideoSections({ videos, unReadVideoIds, newSince, selectedVideoId, expandAll, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef(new Map<string, HTMLButtonElement>());
    const [openSections, setOpenSections] = useState(loadOpenSections);
    // Closing a section during a filter is not remembered past that filter.
    const [closedWhileFiltering, setClosedWhileFiltering] = useState<Set<string>>(new Set());

    // Filter results read best as flat paths; browsing walks the folders one level at a time.
    const root = useMemo(() => expandAll ? buildFlatFolders(videos) : buildNestedFolders(videos), [expandAll, videos]);
    const unread = useMemo(() => new Set(unReadVideoIds), [unReadVideoIds]);

    useEffect(() => {
        try {
            localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify([...openSections]));
        } catch {
            // Storage can be unavailable; the open state then lasts for this page only.
        }
    }, [openSections]);

    // A video opened from elsewhere (URL, auto-play next, upload) reveals its section.
    useEffect(() => {
        const video = videos.find((v) => v.id === selectedVideoId);
        if (!video) {
            return;
        }

        setOpenSections((prev) => {
            const closed = folderAncestors(video.folderKey).filter((path) => !prev.has(path));
            return closed.length ? new Set([...prev, ...closed]) : prev;
        });
        requestAnimationFrame(() => {
            rowRefs.current.get(video.id)?.scrollIntoView({ block: "nearest" });
        });
    }, [selectedVideoId, videos]);

    useEffect(() => {
        setClosedWhileFiltering(new Set());
    }, [expandAll]);

    const toggleIn = (set: Set<string>, folderKey: string) => {
        const next = new Set(set);
        if (!next.delete(folderKey)) {
            next.add(folderKey);
        }
        return next;
    };

    const isOpen = (folderKey: string) =>
        expandAll ? !closedWhileFiltering.has(folderKey) : openSections.has(folderKey);

    const toggle = (folderKey: string) => {
        if (expandAll) {
            setClosedWhileFiltering((prev) => toggleIn(prev, folderKey));
        } else {
            setOpenSections((prev) => toggleIn(prev, folderKey));
        }
    };

    const isNew = (video: VideoWithRevision) =>
        !!newSince && !!video.latestRevision && new Date(video.latestRevision.uploadedAt) > newSince;

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
            unread={unread.has(video.id)}
            isNew={isNew(video)}
            depth={depth}
            containerRef={containerRef}
            onSelect={onSelectVideo}
        />
    );

    const countUnread = (list: VideoWithRevision[]) => list.filter((v) => unread.has(v.id)).length;

    // Each folder wraps its contents, so its sticky header leaves together with them.
    const renderFolder = (folder: FolderNode, depth: number) => (
        <FolderSection
            key={folder.path}
            names={folder.names}
            path={folder.path}
            depth={depth}
            open={isOpen(folder.path)}
            total={folder.allVideos.length}
            unread={countUnread(folder.allVideos)}
            hasNew={folder.allVideos.some(isNew)}
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
