import type { ReactNode } from "react";
import { Folder, FolderOpen, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { FolderPath } from "@/components/controls/folder-path";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "@/components/ui/sidebar";
import { NewBadge } from "@/components/video-browser/new-badge";
import { SECTION_HEADER_REM } from "@/components/video-browser/sections/utils";

type Props = {
    names: string[];
    path: string;
    // How many headers are stacked above this one.
    depth: number;
    open: boolean;
    total: number;
    unread: number;
    hasNew: boolean;
    onToggle: () => void;
    children: ReactNode;
};

export function FolderSection({ names, path, depth, open, total, unread, hasNew, onToggle, children }: Props) {
    const t = useTranslations("video-list-panel");

    return (
        <SidebarMenuItem>
            <Collapsible open={open} onOpenChange={onToggle}>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        variant="sticky"
                        title={path || "/"}
                        style={{ "--sticky-top": `${depth * SECTION_HEADER_REM}rem` } as React.CSSProperties}
                    >
                        {open ? <FolderOpen className="text-primary" /> : <Folder className="text-primary" />}
                        <FolderPath names={names} />

                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{total}</span>

                        <span className="ml-auto flex shrink-0 items-center gap-1.5">
                            {hasNew && <NewBadge />}
                            {unread > 0 && (
                                <MessageSquare aria-label={t("unreadCommentVideos", { count: unread })} className="size-4 text-primary">
                                    <title>{t("unreadCommentVideos", { count: unread })}</title>
                                </MessageSquare>
                            )}
                        </span>
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub inset="start">{children}</SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}
