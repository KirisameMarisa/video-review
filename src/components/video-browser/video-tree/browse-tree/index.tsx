"use client";

import { useEffect, useRef } from "react";
import { Marks } from "@/components/video-browser/marks/marks";
import type { MarkContext } from "@/components/video-browser/marks/use-mark-context";
import { FolderHeaderButton } from "@/components/video-browser/video-tree/nodes/folder/folder-header";
import { BrowseItem } from "@/components/video-browser/video-tree/browse-tree/browse-item";
import { VideoTree } from "@/components/video-browser/video-tree";
import type { FolderList } from "@/components/video-browser/video-tree/use-folder-list";

type Props = {
    folderList: FolderList;
    markContext: MarkContext;
    selectedVideoId: string | null;
    onSelectVideo: (videoId: string) => void;
};

export function BrowseTree({ folderList, markContext, selectedVideoId, onSelectVideo }: Props) {
    const itemRefs = useRef(new Map<string, HTMLButtonElement>());
    const { root, reveal } = folderList;

    // A video opened from elsewhere (URL, auto-play next, upload) is revealed and scrolled to.
    useEffect(() => {
        const video = root.allVideos.find((v) => v.id === selectedVideoId);
        if (!video) {
            return;
        }

        reveal(video.folderKey);
        requestAnimationFrame(() => {
            itemRefs.current.get(video.id)?.scrollIntoView({ block: "nearest" });
        });
    }, [selectedVideoId, root, reveal]);

    return (
        <VideoTree
            folders={folderList}
            slot="browse-tree"
            header={(folder, open) => (
                <FolderHeaderButton
                    names={folder.names}
                    path={folder.path}
                    open={open}
                    total={folder.allVideos.length}
                    marks={<Marks videos={folder.allVideos} scope="folder" context={markContext} />}
                />
            )}
            item={(video) => (
                <BrowseItem
                    ref={(el) => {
                        if (el) {
                            itemRefs.current.set(video.id, el);
                        } else {
                            itemRefs.current.delete(video.id);
                        }
                    }}
                    video={video}
                    selected={video.id === selectedVideoId}
                    marks={<Marks videos={[video]} scope="video" context={markContext} />}
                    onSelect={onSelectVideo}
                />
            )}
        />
    );
}
