"use client";

import { useTranslations } from "next-intl";
import { VideoEventSearchDialog } from "@/components/dialog/video-event-search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { X, Search } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarInput } from "@/ui/sidebar";
import VideoEventContent from "@/components/video-side-panel/panels/video-event-panel/content";
import { useVideoEventSearchStore } from "@/stores/video-event-search-store";
import { useVideoEventStore } from "@/stores/video-event-store";
import { useVideoStore } from "@/stores/video-store";
import { VideoSidePanelDefinition } from "@/components/video-side-panel/types";

export function useVideoEventPanelDefinition(): VideoSidePanelDefinition {
    const tEvent = useTranslations("video-event-panel");
    const { selectedRevision } = useVideoStore();
    const { fetchEvents } = useVideoEventStore();
    const eventSearch = useVideoEventSearchStore();

    return {
        key: "events",
        label: tEvent("tab"),
        renderPanel: ({ topAreaRef }) => <VideoEventContent topAreaRef={topAreaRef} />,
        renderHeaderActions: ({ openDialog }) => (
            <div>
                <button
                    onClick={openDialog}
                    className={`
                        inline-flex items-center justify-center
                        text-lg px-1 leading-none hover:text-[#ff5500]
                        ${eventSearch.isFiltering() ? "text-[#15fa34ff]" : ""}
                    `}
                >
                    <FontAwesomeIcon icon={faSearch} />
                </button>
                {eventSearch.isFiltering()
                    ? (
                        <button
                            onClick={() => {
                                eventSearch.clear();
                                if (selectedRevision) {
                                    fetchEvents(selectedRevision);
                                }
                            }}
                            className="inline-flex items-center justify-center hover:text-[#ff5500]"
                        >
                            <X className="size-5" />
                        </button>
                    )
                    : null}
            </div>
        ),
        renderHeaderBody: () => (
            <SidebarGroup className="py-0">
                <SidebarGroupContent className="relative mt-1">
                    <SidebarInput
                        value={eventSearch.filterText}
                        onChange={(e) => eventSearch.setFilterText(e.target.value)}
                        placeholder="Filter event text..."
                        className="pl-8 border-[#fff] w-full h-8 rounded bg-[#181818] border text-sm text-white"
                    />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        ),
        renderDialog: ({ open, onClose }) => (
            <VideoEventSearchDialog open={open} onClose={onClose} />
        ),
    };
}
