import type { ComponentProps, ReactNode } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { RowThumbnail } from "@/components/video-browser/sections/video-row/row-thumbnail";

type RowProps = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
};

// A video in organize mode, showing only what tells videos apart when deciding where they go:
// the thumbnail and the whole title, wrapped rather than shortened. Other button props, such as
// key handlers, pass through to the button.
export function OrganizeRowButton({ video, containerRef, ...props }: RowProps & ComponentProps<"button">) {
    return (
        <SidebarMenuButton {...props} size="auto">
            <RowThumbnail video={video} containerRef={containerRef} />
            <div className="min-w-0 flex-1 text-base font-medium wrap-break-word">{video.title}</div>
        </SidebarMenuButton>
    );
}

// The row with a field in place of the title, as a plain element since a field can't sit inside
// a button.
export function OrganizeRowField({ video, containerRef, children }: RowProps & { children: ReactNode }) {
    return (
        <SidebarMenuButton asChild size="auto">
            <div>
                <RowThumbnail video={video} containerRef={containerRef} />
                {children}
            </div>
        </SidebarMenuButton>
    );
}
