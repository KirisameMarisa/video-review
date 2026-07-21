"use client";

import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Tree, TreeApi } from "react-arborist";
import { useSize } from "@radix-ui/react-use-size";
import { VideoNode } from "@/components/video-browser/tree/types";
import { NodeRenderer } from "@/components/video-browser/node-renderer";
import { buildTree, findPath } from "@/components/video-browser/tree/utils";
import { Video } from "@/lib/db-types";

type Props = {
    videos: Video[];
    unReadVideoIds: string[];
    selectedVideoId: string | null;
    onSelectVideo: (videoId: string) => void;
};

export default function VideoFoldersTree({
    videos,
    unReadVideoIds,
    selectedVideoId,
    onSelectVideo,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const size = useSize(containerRef.current);

    const [openNodes, setOpenNodes] = useState<Record<string, boolean>>(() => {
        try {
            const raw = localStorage.getItem("videoTreeOpenNodes");
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    const treeRef = useRef<TreeApi<VideoNode>>(null);
    const data = useMemo(() => buildTree(videos, unReadVideoIds), [videos]);

    useEffect(() => {
        localStorage.setItem("videoTreeOpenNodes", JSON.stringify(openNodes));
    }, [openNodes]);

    useEffect(() => {
        const api = treeRef.current;
        if (!api) return;

        for (const [id, isOpen] of Object.entries(openNodes)) {
            if (isOpen) {
                api.open(id);
            } else {
                api.close(id);
            }
        }

        if (!selectedVideoId) return;

        const node = api.get(selectedVideoId);

        if (node) {
            // The target node is already mounted in the tree.
            // We can safely scroll to it without changing the open state.
            api.scrollTo(selectedVideoId);
        } else {
            // The target node is not yet available.
            // This usually means one or more parent folders are still closed.
            const path = findPath(api.root, selectedVideoId);
            if (path) {
                // Open all parent nodes so that the target node becomes visible.
                // The last node in the path is the target itself, so it is excluded.
                for (const node of path.slice(0, -1)) {
                    api.open(node.id);
                }

                // Scrolling must be deferred until after the tree re-renders
                // with the newly opened nodes.
                requestAnimationFrame(() => {
                    api.scrollTo(selectedVideoId);
                });
            }
        }
    }, [data, selectedVideoId]);

    return (
        <div ref={containerRef} className="h-full w-full">
            <Tree
                ref={treeRef}
                data={data}
                openByDefault
                rowHeight={28}
                width={(size?.width ?? 0) - 1}
                height={size?.height ?? 0}
                paddingBottom={50}
                onToggle={(id) => {
                    const api = treeRef.current;
                    if (!api) return;

                    const node = api.get(id);
                    if (!node) return;

                    setOpenNodes((prev) => ({
                        ...prev,
                        [id]: node.isOpen,
                    }));
                }}
                onSelect={(nodes) => {
                    const node = nodes[0];
                    if (node?.data.type === "video" && node.data.video) {
                        onSelectVideo(node.data.video.id);
                    }
                }}
            >

                {(props) => (
                    <NodeRenderer
                        {...props}
                        selectedId={selectedVideoId ?? ""}
                    />
                )}
            </Tree>
        </div>
    );
}
