import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { RowThumbnail } from "@/components/video-browser/sections/video-row/row-thumbnail";

type Props = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
};

// Only what tells videos apart when deciding where they go: the thumbnail and the whole title,
// wrapped rather than shortened.
export function OrganizeRow({ video, containerRef }: Props) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton size="auto">
                <RowThumbnail video={video} containerRef={containerRef} />
                <div className="min-w-0 flex-1 text-base font-medium wrap-break-word">{video.title}</div>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
