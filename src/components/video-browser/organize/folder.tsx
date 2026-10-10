import type { ReactNode } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { FolderPath } from "@/components/controls/folder-path";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "@/components/ui/sidebar";
import { FOLDER_HEADER_REM } from "@/components/video-browser/sections/folder";

type Props = {
    name: string;
    path: string;
    // How many headers are stacked above this one.
    depth: number;
    open: boolean;
    total: number;
    onToggle: () => void;
    children: ReactNode;
};

export function OrganizeFolder({ name, path, depth, open, total, onToggle, children }: Props) {
    return (
        <SidebarMenuItem>
            <Collapsible open={open} onOpenChange={onToggle}>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        variant="sticky"
                        title={path}
                        style={{ "--sticky-top": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}
                    >
                        {open ? <FolderOpen className="text-primary" /> : <Folder className="text-primary" />}
                        <FolderPath names={[name]} count={total} />
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub inset="start">{children}</SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}
