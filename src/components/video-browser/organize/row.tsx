import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { RowThumbnail } from "@/components/video-browser/sections/video-row/row-thumbnail";

type Props = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
    buttonProps?: ComponentProps<"button">;
    // Shown instead of the title, with the row as a plain element so it can hold a field.
    replacement?: ReactNode;
    onRename: () => void;
};

// Only what tells videos apart when deciding where they go: the thumbnail and the whole title,
// wrapped rather than shortened.
export function OrganizeRow({ video, containerRef, buttonProps, replacement, onRename }: Props) {
    const t = useTranslations("video-list-panel.organize");
    const thumbnail = <RowThumbnail video={video} containerRef={containerRef} />;

    return (
        <SidebarMenuItem>
            {replacement ? (
                <SidebarMenuButton asChild size="auto">
                    <div>
                        {thumbnail}
                        {replacement}
                    </div>
                </SidebarMenuButton>
            ) : (
                <>
                    <SidebarMenuButton {...buttonProps} size="auto">
                        {thumbnail}
                        <div className="min-w-0 flex-1 text-base font-medium wrap-break-word">{video.title}</div>
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover title={t("rename.action")} onClick={onRename}>
                        <Pencil />
                    </SidebarMenuAction>
                </>
            )}
        </SidebarMenuItem>
    );
}
