import type { ReactNode, Ref } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { VideoDetailHoverCard } from "@/components/video-browser/thumbnail-cell/detail-card";
import { thumbnailKey } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { RowThumbnail } from "@/components/video-browser/video-tree/row-thumbnail";
import { VideoSummary } from "@/components/video-browser/video-tree/browse-tree/video-row/video-summary";
import { FOLDER_HEADER_REM } from "@/components/video-browser/video-tree/folder";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    ref: Ref<HTMLButtonElement>;
    video: VideoWithRevision;
    selected: boolean;
    marks: ReactNode;
    // How many section headers are stacked above this row.
    depth: number;
    onSelect: (videoId: string) => void;
};

export function VideoRow({ ref, video, selected, marks, depth, onSelect }: Props) {
    const urls = useThumbnailGridStore((s) => s.urls);
    const select = () => onSelect(video.id);

    return (
        <SidebarMenuItem>
            <VideoDetailHoverCard video={video} thumbnailUrl={urls.get(thumbnailKey(video.id))} onSelect={select}>
                <SidebarMenuButton
                    ref={ref}
                    size="auto"
                    isActive={selected}
                    aria-current={selected || undefined}
                    onClick={select}
                    // HoverCardTrigger preventDefaults touchstart, which cancels the synthesized click.
                    onPointerUp={(e) => {
                        if (e.pointerType === "touch") {
                            select();
                        }
                    }}
                    // A clicked row keeps focus; opening the card on focus would leave it covering the
                    // player after switching windows or tabbing down the list.
                    onFocus={(e) => e.preventDefault()}
                    style={{ "--row-scroll-margin": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}
                    // Clears the stacked sticky headers when scrolled into view.
                    className="scroll-mt-(--row-scroll-margin)"
                >
                    <RowThumbnail video={video} />
                    <VideoSummary video={video} />

                    {marks}
                </SidebarMenuButton>
            </VideoDetailHoverCard>
        </SidebarMenuItem>
    );
}
