"use client";

import { useTranslations } from "next-intl";
import { CommentSearchDialog } from "@/components/dialog/comment-search";
import CalendarDateRadio from "@/ui/calendar-date-radio";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { X, Search } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarInput } from "@/ui/sidebar";
import VideoCommentContent from "@/components/video-side-panel/panels/video-comment-panel/content";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import { VideoSidePanelDefinition } from "@/components/video-side-panel/types";

export function useVideoCommentPanelDefinition(): VideoSidePanelDefinition {
    const tComment = useTranslations("video-comment-panel");
    const { selectedRevision } = useVideoStore();
    const { fetchComments } = useCommentStore();
    const commentSearch = useCommentSearchStore();
    const dateFilter = useCommentSearchDateFilterStore();

    // The date filter lives in its own store, so fold it into the indicator.
    const filtering = commentSearch.isFiltering() || dateFilter.mode !== "none";

    return {
        key: "comments",
        label: tComment("title"),
        renderPanel: ({ topAreaRef }) => <VideoCommentContent topAreaRef={topAreaRef} />,
        renderHeaderActions: ({ openDialog }) => (
            <div>
                <button
                    onClick={openDialog}
                    className={`
                        inline-flex items-center justify-center
                        text-lg px-1 leading-none hover:text-[#ff5500]
                        ${filtering ? "text-[#15fa34ff]" : ""}
                    `}
                >
                    <FontAwesomeIcon icon={faSearch} />
                </button>
                {filtering
                    ? (
                        <button
                            onClick={() => {
                                commentSearch.clear();
                                dateFilter.clear();
                                if (selectedRevision) {
                                    fetchComments(selectedRevision);
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
                <CalendarDateRadio
                    mode={dateFilter.mode}
                    range={dateFilter.mode === "range" && dateFilter.from && dateFilter.to
                        ? { from: new Date(dateFilter.from), to: new Date(dateFilter.to) }
                        : undefined}
                    onToday={dateFilter.setToday}
                    onRecent={dateFilter.setRecent}
                    onSetRange={dateFilter.setRange}
                    onClear={dateFilter.clear}
                    className="size-10"
                />

                <SidebarGroupContent className="relative mt-1">
                    <SidebarInput
                        value={commentSearch.filterText}
                        onChange={(e) => commentSearch.setFilterText(e.target.value)}
                        placeholder="Filter comment text..."
                        className="pl-8 border-[#fff] w-full h-8 rounded bg-[#181818] border text-sm text-white"
                    />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        ),
        renderDialog: ({ open, onClose }) => (
            <CommentSearchDialog open={open} onClose={onClose} />
        ),
    };
}
