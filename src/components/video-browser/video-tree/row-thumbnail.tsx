import { useContext } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { TreeScrollContext } from "@/components/video-browser/video-tree";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

export function RowThumbnail({ video }: { video: VideoWithRevision }) {
    const containerRef = useContext(TreeScrollContext);
    const urls = useThumbnailGridStore((s) => s.urls);
    const cacheUrl = useThumbnailGridStore((s) => s.cacheUrl);

    return (
        <div className="w-20 shrink-0 thumb-frame">
            <ThumbnailLazyLoader video={video} containerRef={containerRef} cache={urls} onResolve={cacheUrl} />
        </div>
    );
}
