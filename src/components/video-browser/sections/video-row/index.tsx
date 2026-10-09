import type { ReactNode, Ref } from "react";
import { useFormatter } from "next-intl";
import { VideoWithRevision } from "@/lib/db-types";
import { MiddleTruncate } from "@/components/controls/middle-truncate";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { FOLDER_HEADER_REM } from "@/components/video-browser/sections/folder";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    ref: Ref<HTMLButtonElement>;
    video: VideoWithRevision;
    selected: boolean;
    marks: ReactNode;
    // How many section headers are stacked above this row.
    depth: number;
    containerRef: React.RefObject<HTMLDivElement | null>;
    onSelect: (videoId: string) => void;
};

export function VideoRow({ ref, video, selected, marks, depth, containerRef, onSelect }: Props) {
    const format = useFormatter();
    const urls = useThumbnailGridStore((s) => s.urls);
    const cacheUrl = useThumbnailGridStore((s) => s.cacheUrl);
    const latest = video.latestRevision;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                ref={ref}
                size="auto"
                isActive={selected}
                aria-current={selected || undefined}
                title={video.title}
                onClick={() => onSelect(video.id)}
                style={{ "--row-scroll-margin": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}
                // Clears the stacked sticky headers when scrolled into view.
                className="scroll-mt-(--row-scroll-margin)"
            >
                <div className="w-20 shrink-0 overflow-hidden rounded-sm">
                    <ThumbnailLazyLoader video={video} containerRef={containerRef} cache={urls} onResolve={cacheUrl} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="text-base font-medium">
                        <MiddleTruncate text={video.title} />
                    </div>

                    {latest && (
                        <div className="flex gap-1.5 tabular-nums text-muted-foreground">
                            <span className="font-mono">v{latest.revision}</span>
                            <span>{format.relativeTime(new Date(latest.uploadedAt), new Date())}</span>
                        </div>
                    )}
                </div>

                {marks}
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
