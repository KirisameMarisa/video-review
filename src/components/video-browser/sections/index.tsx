"use client";

import { useEffect, useRef } from "react";
import { Marks } from "@/components/video-browser/marks/marks";
import type { MarkContext } from "@/components/video-browser/marks/use-mark-context";
import { FolderHeaderButton } from "@/components/video-browser/sections/folder/folder-header";
import { VideoRow } from "@/components/video-browser/sections/video-row";
import { VideoTree } from "@/components/video-browser/sections/video-tree";
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
    const { root, reveal } = folderList;

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

    return (
        <VideoTree
            folders={folderList}
            containerRef={containerRef}
            slot="video-sections"
            header={(folder, open) => (
                <FolderHeaderButton
                    names={folder.names}
                    path={folder.path}
                    open={open}
                    total={folder.allVideos.length}
                    marks={<Marks videos={folder.allVideos} scope="folder" context={markContext} />}
                />
            )}
            row={(video, depth) => (
                <VideoRow
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
            )}
        />
    );
}
