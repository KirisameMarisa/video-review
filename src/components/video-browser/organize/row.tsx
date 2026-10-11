import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuAction, SidebarMenuButton } from "@/components/ui/sidebar";
import { RowThumbnail } from "@/components/video-browser/sections/video-row/row-thumbnail";

type RowProps = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
};

// A video with only what tells it apart when organizing: the thumbnail and the whole title.
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

// The pencil beside a row or folder header that starts renaming it, shown on hover or focus.
export function RenameAction({ onClick }: { onClick: () => void }) {
    const t = useTranslations("video-list-panel.organize.rename");

    return (
        <SidebarMenuAction showOnHover title={t("action")} onClick={onClick}>
            <Pencil />
        </SidebarMenuAction>
    );
}
