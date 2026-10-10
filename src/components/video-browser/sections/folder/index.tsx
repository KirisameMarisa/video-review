import type { ReactNode } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { FolderPath } from "@/components/controls/folder-path";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "@/components/ui/sidebar";

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
    marks: ReactNode;
    onToggle: () => void;
    children: ReactNode;
};

export function FolderSection({ names, path, depth, open, total, marks, onToggle, children }: Props) {
    return (
        <SidebarMenuItem>
            <Collapsible open={open} onOpenChange={onToggle}>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        variant="sticky"
                        title={path || "/"}
                        style={{ "--sticky-top": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}
                    >
                        {open ? <FolderOpen className="text-primary" /> : <Folder className="text-primary" />}
                        <FolderPath names={names} count={total} />

                        {marks}
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub inset="start">{children}</SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}
