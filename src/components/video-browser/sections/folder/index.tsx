import type { ComponentProps, ReactNode } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { FolderPath } from "@/components/controls/folder-path";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuHeader, SidebarMenuItem, SidebarMenuSub } from "@/components/ui/sidebar";

// The header's height (SidebarMenuButton's default h-8), so nested headers can stick one
// header below their parent and rows can scroll clear of the stacked headers.
export const FOLDER_HEADER_REM = 2;

type Props = {
    names: string[];
    path: string;
    // How many headers are stacked above this one.
    depth: number;
    open: boolean;
    total: number;
    // Shown at the right end; organize mode has none.
    marks?: ReactNode;
    // Handlers the caller adds to the header button, such as organize mode's rename keys.
    buttonProps?: ComponentProps<"button">;
    // Shown instead of the name and count, with the header as a plain element so it can hold a field.
    replacement?: ReactNode;
    // A SidebarMenuAction beside the header, which stays on screen with it.
    action?: ReactNode;
    onToggle: () => void;
    children: ReactNode;
};

export function FolderSection({ names, path, depth, open, total, marks, buttonProps, replacement, action, onToggle, children }: Props) {
    const icon = open ? <FolderOpen className="text-primary" /> : <Folder className="text-primary" />;

    return (
        <SidebarMenuItem>
            <Collapsible open={open} onOpenChange={onToggle}>
                <SidebarMenuHeader style={{ "--sticky-top": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}>
                    {replacement ? (
                        <SidebarMenuButton asChild size="auto">
                            <div>
                                {icon}
                                {replacement}
                            </div>
                        </SidebarMenuButton>
                    ) : (
                        <>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton {...buttonProps} title={path || "/"}>
                                    {icon}
                                    <FolderPath names={names} count={total} />

                                    {marks}
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            {action}
                        </>
                    )}
                </SidebarMenuHeader>

                <CollapsibleContent>
                    <SidebarMenuSub inset="start">{children}</SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}
