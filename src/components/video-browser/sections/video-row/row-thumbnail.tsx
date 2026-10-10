import { VideoWithRevision } from "@/lib/db-types";
import { ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    video: VideoWithRevision;
    // The scrolling list, so thumbnails load as they come into view.
    containerRef: React.RefObject<HTMLDivElement | null>;
};

export function RowThumbnail({ video, containerRef }: Props) {
    const urls = useThumbnailGridStore((s) => s.urls);
    const cacheUrl = useThumbnailGridStore((s) => s.cacheUrl);

    return (
        <div className="w-20 shrink-0 overflow-hidden rounded-sm">
            <ThumbnailLazyLoader video={video} containerRef={containerRef} cache={urls} onResolve={cacheUrl} />
        </div>
    );
}
