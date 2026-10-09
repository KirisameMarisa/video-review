import { forwardRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ThumbnailDetailCard } from "@/components/video-browser/thumbnail-cell/detail-card";
import { NewBadge } from "@/components/video-browser/marks/parts/new-mark";

type Props = {
    video: VideoWithRevision;
    selectedVideoId: string | undefined;
    unread: boolean;
    /** Resolved by the lazy loader; reused by the hover card. */
    thumbnailUrl: string | undefined;
    children?: React.ReactNode;
    onSelectVideo?: (videoId: string) => void;
};

/** Picture-only grid cell; hovering it opens the detail card beside it. */
export const ThumbnailCell = forwardRef<HTMLDivElement, Props>(
    function ThumbnailCell({ video, selectedVideoId, unread, thumbnailUrl, onSelectVideo, children }, ref) {
        const isSelected = video.id === selectedVideoId;
        const select = () => onSelectVideo?.(video.id);

        return (
            <HoverCard openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                    <div
                        ref={ref}
                        data-slot="thumbnail-card"
                        role="button"
                        tabIndex={0}
                        aria-label={video.title}
                        className={cn(
                            "relative rounded-sm overflow-hidden ring-1 cursor-pointer transition-shadow",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground",
                            isSelected ? "ring-2 ring-primary" : "ring-accent hover:ring-muted-foreground"
                        )}
                        onClick={select}
                        // HoverCardTrigger preventDefaults touchstart, which cancels the synthesized click.
                        onPointerUp={(e) => { if (e.pointerType === "touch") select(); }}
                        onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            select();
                        }}
                    >
                        {unread && <NewBadge className="absolute top-1 left-1 z-10" />}
                        {children}
                    </div>
                </HoverCardTrigger>

                <HoverCardContent
                    data-slot="thumbnail-detail"
                    side="right"
                    sideOffset={8}
                    collisionPadding={12}
                    onClick={select}
                    className="w-136 max-w-screen-gutter cursor-pointer"
                >
                    <div className="flex gap-3">
                        <ThumbnailDetailCard video={video} thumbnailUrl={thumbnailUrl} />
                    </div>
                </HoverCardContent>
            </HoverCard>
        );
    }
);
