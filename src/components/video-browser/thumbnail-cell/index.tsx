import { Video, VideoRevision, VideoWithRevision } from "@/lib/db-types";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ThumbnailCellProps = {
    video: Video;
    videoRevision: number | undefined;
    selectedVideoId: string | undefined;
    hideTitle: boolean;
    hideFolder: boolean;
    children?: React.ReactNode;
    onSelectVideo?: (videoId: string) => void;
};

export const ThumbnailCell = forwardRef<HTMLDivElement, ThumbnailCellProps>(
    function ThumbnailCell(props, ref) {
        const { video, videoRevision,selectedVideoId, hideTitle, hideFolder, onSelectVideo, children } = props;
        const isSelected = video.id === selectedVideoId;

        return (
            <div
                ref={ref}
                className={cn(
                    "bg-[#202020] rounded-md overflow-hidden border",
                    isSelected && "border-[#ff8800]"
                )}
                onClick={() => onSelectVideo?.(video.id)}
            >
                {children}

                {(!hideTitle || !hideFolder) && (
                    <div className="p-2">
                        {!hideTitle && (
                            <div className="text-xs truncate">{video.title}</div>
                        )}
                        {!hideFolder && (
                            <div className="text-xs text-[#777] truncate">
                                {video.folderKey} {formatDate((video as VideoWithRevision).latestRevision?.uploadedAt)} · Rev.{videoRevision}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

type ThumbnailLazyLoaderProps = {
    video: Video;
    videoRevision: number | undefined;
    containerRef: React.RefObject<HTMLDivElement | null>;
    cache: Map<string, string | undefined>;
    onResolve?: (key: string, resolveURL: string | undefined) => void;
};

export function ThumbnailLazyLoader({ video, videoRevision, containerRef, cache, onResolve }: ThumbnailLazyLoaderProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const key = `thumbnails/${video.id}/thumb.png`;
    const cached = cache.get(key);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (!ref.current || cached !== undefined) return;

        const observer = new IntersectionObserver(
            entries => {
                if (!entries[0].isIntersecting) return;

                setIsResolving(true);
                fetchMediaUrl(key)
                    .then(ret => onResolve?.(key, ret.ok ? ret.data : undefined))
                    .finally(() => {
                        setIsResolving(false);
                        observer.disconnect();
                    });
            },
            { root: containerRef.current, rootMargin: "200px" }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [cached, key]);

    return (
        <div ref={ref} className="bg-[#111]" style={{ aspectRatio: "16 / 9" }}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {cached ? (
                        <img src={cached} className="w-full h-full object-cover" />
                    ) : isResolving ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center text-xs text-[#666] w-full h-full">
                            thumbnail
                        </div>
                    )}
                </TooltipTrigger>
                <TooltipContent className="max-w-65">
                    <div className="text-xs font-medium leading-tight">
                        {video.title}
                    </div>
                    <div className="mt-1 text-[11px] text-[#aaa]">
                        {formatDate((video as VideoWithRevision).latestRevision?.uploadedAt)} · Rev.{videoRevision}
                    </div>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
