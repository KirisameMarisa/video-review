import type { ReactNode, Ref } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { VideoDetailHoverCard } from "@/components/video-browser/thumbnail-cell/detail-card";
import { thumbnailKey } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { VideoItemButton } from "@/components/video-browser/video-tree/nodes/item/video-item";
import { VideoSummary } from "@/components/video-browser/video-tree/browse-tree/browse-item/video-summary";
import { FOLDER_HEADER_REM } from "@/components/video-browser/video-tree/nodes/folder";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    ref: Ref<HTMLButtonElement>;
    video: VideoWithRevision;
    selected: boolean;
    marks: ReactNode;
    // How many section headers are stacked above this item.
    depth: number;
    onSelect: (videoId: string) => void;
};

export function BrowseItem({ ref, video, selected, marks, depth, onSelect }: Props) {
    const urls = useThumbnailGridStore((s) => s.urls);
    const select = () => onSelect(video.id);

    return (
        <SidebarMenuItem>
            <VideoDetailHoverCard video={video} thumbnailUrl={urls.get(thumbnailKey(video.id))} onSelect={select}>
                <VideoItemButton
                    ref={ref}
                    video={video}
                    isActive={selected}
                    aria-current={selected || undefined}
                    onClick={select}
                    // HoverCardTrigger preventDefaults touchstart, which cancels the synthesized click.
                    onPointerUp={(e) => {
                        if (e.pointerType === "touch") {
                            select();
                        }
                    }}
                    // A clicked item keeps focus; opening the card on focus would leave it covering the
                    // player after switching windows or tabbing down the list.
                    onFocus={(e) => e.preventDefault()}
                    style={{ "--item-scroll-margin": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}
                    // Clears the stacked sticky headers when scrolled into view.
                    className="scroll-mt-(--item-scroll-margin)"
                >
                    <VideoSummary video={video} />

                    {marks}
                </VideoItemButton>
            </VideoDetailHoverCard>
        </SidebarMenuItem>
    );
}
