import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { SidebarMenuAction } from "@/components/ui/sidebar";

// The pencil beside a row or folder header that starts renaming it, shown on hover or focus.
export function RenameAction({ onClick }: { onClick: () => void }) {
    const t = useTranslations("video-list-panel.organize.rename");

    return (
        <SidebarMenuAction showOnHover title={t("action")} onClick={onClick}>
            <Pencil />
        </SidebarMenuAction>
    );
}
