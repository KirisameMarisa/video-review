"use client";

import { useTranslations } from "next-intl";
import { CommentSearchDialog } from "@/components/dialog/comment-search";
import CalendarDateRadio from "@/components/controls/calendar-date-radio";
import { SidebarGroup } from "@/ui/sidebar";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { PanelSearchActions } from "@/components/video-side-panel/panel-search-actions";
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
        renderPanel: () => <VideoCommentContent />,
        renderHeaderActions: ({ openDialog }) => (
            <PanelSearchActions
                filtering={filtering}
                onOpen={openDialog}
                onClear={() => {
                    commentSearch.clear();
                    dateFilter.clear();
                    if (selectedRevision) {
                        fetchComments(selectedRevision);
                    }
                }}
            />
        ),
        renderHeaderBody: () => (
            <SidebarGroup>
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

                <SidebarSearchInput value={commentSearch.filterText} onChange={commentSearch.setFilterText} placeholder="Filter comment text..." />
            </SidebarGroup>
        ),
        renderDialog: ({ open, onClose }) => (
            <CommentSearchDialog open={open} onClose={onClose} />
        ),
    };
}
