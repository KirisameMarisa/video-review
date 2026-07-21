"use client";

import { CardHeader } from "@/ui/card";
import { formatDate, formatTime } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { VideoEventWithKind } from "@/lib/db-types";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV, faLink } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { ShareLinkDialog } from "@/components/dialog/share-link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useVideoStore } from "@/stores/video-store";
import { createVideoEventLink } from "@/lib/url";

// Dropdown menu item for copying a shareable link to the selected comment.
function DropdownMenu_SharedLink(props: { eventContentId: string }) {
    const t = useTranslations("video-comment-panel");
    const [open, setOpen] = useState(false);
    const { selectedVideo, selectedRevision } = useVideoStore();

    const createLink = () => {
        if (!selectedVideo || !selectedRevision) {
            return "";
        }
        
        return createVideoEventLink(window.location.origin, selectedVideo?.id, selectedRevision?.id, props.eventContentId) ?? "";
    }

    return (
        <>
            <DropdownMenuItem className="gap-2"
                onClick={() => { setOpen(true) }}
                onSelect={(e) => { e.preventDefault() }}>
                <FontAwesomeIcon icon={faLink} />
                {t("commentItemCopyLink")}
            </DropdownMenuItem>
            <ShareLinkDialog url={createLink()} open={open} onOpenChange={setOpen} />
        </>
    );
}

export default function EventCardHeader(props: { event: VideoEventWithKind }) {
    return (
        <CardHeader className="flex flex-row items-center justify-between px-3 pb-1">
            <div className="flex flex-col leading-none gap-1">
                <span className="text-sm font-medium">{props.event.kind.label}</span>
                <div className="mb-2 flex gap-1 text-xs">
                    <span className="border border-[#7f783d] text-[#eae60b] bg-[#7f783d] rounded px-1">
                        {formatTime(props.event.startMs / 1000)}
                    </span>
                    <span className="border border-[#555] text-[#ddd] bg-[#333] rounded px-1">
                        {formatTime(props.event.endMs / 1000)}
                    </span>
                </div>
            </div>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#aaa] hover:bg-[#7d7d7d] w-8 h-8"
                    >
                        <FontAwesomeIcon icon={faEllipsisV} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#181818] text-white border-[#333]">
                    <DropdownMenu_SharedLink eventContentId={props.event.contentId ?? ""} />
                    {
                        props.event.links.map((link, idx) => (
                            <DropdownMenuItem key={idx} className="gap-2"
                                onClick={() => { window.open(link.url, "_blank") }}
                                onSelect={(e) => { e.preventDefault() }}>
                                <FontAwesomeIcon icon={faLink} />
                                {link.label ?? link.url}
                            </DropdownMenuItem>
                        ))
                    }
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
    );
}
