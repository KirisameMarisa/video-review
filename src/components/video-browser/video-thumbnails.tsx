"use client";

import { Separator } from "@/ui/separator";
import { useEffect, useMemo, useRef, useState } from "react";
import { Video, VideoRevision } from "@/lib/db-types";
import { Slider } from "@/ui/slider";
import { ZoomInIcon } from "lucide-react";
import { ThumbnailCell, ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell";

type Props = {
    videos: Video[];
    videoRevision: number | undefined;
    selectedVideoId: string | undefined;
    onSelectVideo?: (videoId: string) => void;
};

export default function VideoThumbnails({ videos, videoRevision, selectedVideoId, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [thumbSize, setThumbSize] = useState(160);
    const [containerWidth, setContainerWidth] = useState(0);
    const gap = 16;
    const currentColumns = useMemo(() => {
        return Math.max(
            1,
            Math.floor((containerWidth + gap) / (thumbSize + gap))
        );
    }, [containerWidth, thumbSize]);

    const hideTitle = useMemo(() => currentColumns >= 4, [currentColumns]);
    const hideFolder = useMemo(() => currentColumns >= 3, [currentColumns]);
    const [thumbnailsCache, setThumbnailsCache] = useState<Map<string, string | undefined>>(() => new Map());
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0].contentRect;
            setContainerWidth(rect.width);
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!selectedVideoId) return;

        const el = itemRefs.current.get(selectedVideoId);
        if (!el) return;

        el.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [selectedVideoId]);

    return (
        <div
            ref={containerRef}
            style={{ height: "calc(100% - 50px)", scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
            className="font-sans text-white bg-[#181818] w-full h-full flex flex-col border-r border-[#333]"
        >
            {/* Grid */}
            <div className="flex-1 overflow-auto p-3">
                <div className="grid gap-3" style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
                }}>
                    {videos.map(video => (
                        <ThumbnailCell
                            key={video.id}
                            ref={el => {
                                if (el) {
                                    itemRefs.current.set(video.id, el);
                                } else {
                                    itemRefs.current.delete(video.id);
                                }
                            }}
                            video={video}
                            videoRevision={videoRevision}
                            selectedVideoId={selectedVideoId}
                            hideTitle={hideTitle}
                            hideFolder={hideFolder}
                            onSelectVideo={onSelectVideo}
                        >
                            <ThumbnailLazyLoader
                                video={video}
                                videoRevision={videoRevision}
                                containerRef={containerRef}
                                cache={thumbnailsCache}
                                onResolve={(key, url) => {
                                    setThumbnailsCache(prev => {
                                        const next = new Map(prev);
                                        next.set(key, url);
                                        return next;
                                    });
                                }}
                            />
                        </ThumbnailCell>
                    ))}
                </div>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3 px-3 py-3 border-t border-[#333] bg-[#141414]">
                <ZoomInIcon></ZoomInIcon>
                <Slider
                    min={60}
                    max={200}
                    step={10}
                    value={[thumbSize]}
                    onValueChange={(v) => {
                        setThumbSize(v[0])
                    }}
                    onValueCommit={(v) => {
                        setThumbSize(v[0])
                    }}
                    className="w-full"
                />
            </div>
            <Separator className="bg-[#333]" />
        </div>
    );
}
