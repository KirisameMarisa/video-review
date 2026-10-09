"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter } from "@/ui/sidebar"
import { AccountMenu } from "@/components/setting";
import VideoUploadDialog from "@/components/dialog/video-upload";
import VideoListPanelHeader from "@/components/video-browser/header";
import { VideoSearchDialog } from "@/components/dialog/video-search";
import VideoThumbnailsPanel from "@/components/video-browser/video-thumbnails-panel";
import { VideoSections } from "@/components/video-browser/sections";
import { useMarkContext } from "@/components/video-browser/marks/use-mark-context";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoListStore } from "@/stores/video-list-store";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { useVideoDateFilterStore } from "@/stores/date-filter-store";
import { useDrawingStore } from "@/stores/drawing-store";
import DrawingToolPanel from "@/components/drawing-tool-panel";

export default function VideoListPanel() {
    const router = useRouter();
    const { userId } = useAuthStore();
    const loadUnread = useCommentStore((s) => s.loadUnread);
    const recordVisit = useVideoListStore((s) => s.recordVisit);
    const { videos, reloadOnViewChange, reloadOnDataChange, selectedVideo } = useVideoStore();
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
    const markContext = useMarkContext();
    const unReadVideoIds = useMemo(() => [...markContext.unreadVideoIds], [markContext.unreadVideoIds]);
    const canvasEditing = useDrawingStore((s) => s.canvasEditing);
    const searching = useVideoSearchStore((s) => s.isFiltering());
    const dateFiltering = useVideoDateFilterStore((s) => s.mode !== "none");

    useEffect(() => {
        recordVisit();
        void (async () => {
            await reloadOnViewChange();
        })();
    }, [])

    // Once per page load and signed-in user; reading a video afterwards updates it in place (markRead).
    useEffect(() => {
        loadUnread(userId).catch((reason) => console.error(reason));
    }, [userId, loadUnread]);

    return (
        <>
            <Sidebar>
                {/* While a drawing is being edited the sidebar shows the tool panel instead. The list
                    is hidden, not unmounted: its header refetches videos on mount, reloading the player. */}
                {canvasEditing && <DrawingToolPanel />}
                <div className={canvasEditing ? "hidden" : "contents"}>
                    <VideoListPanelHeader
                        onSearchDialogShow={() => setSearchDialogOpen(true)}
                        onUploadDialogShow={() => setUploadDialogOpen(true)}
                        onThumbnailsToggle={() => setThumbnailsOpen((open) => !open)}
                        thumbnailsOpen={thumbnailsOpen}
                    />

                    <SidebarContent>
                        <VideoSections
                            videos={videos}
                            markContext={markContext}
                            selectedVideoId={selectedVideo?.id ?? null}
                            filtering={searching || dateFiltering}
                            onSelectVideo={(id) => {
                                router.replace(`/video-review/review/${id}`);
                            }}
                        />
                    </SidebarContent>

                    <SidebarFooter>
                        <AccountMenu />
                    </SidebarFooter>
                </div>

                <VideoSearchDialog open={searchDialogOpen} onClose={() => setSearchDialogOpen(false)} />
                <VideoUploadDialog open={uploadDialogOpen} onClose={async (uploadedVideoId) => {
                    setUploadDialogOpen(false);
                    await reloadOnDataChange();

                    // A new revision of the open video: show it rather than the one that was playing.
                    const { selectedVideo: open, revisions, selectVideoRevision } = useVideoStore.getState();
                    if (uploadedVideoId && uploadedVideoId === open?.id && revisions[0]) {
                        selectVideoRevision(revisions[0]);
                    }

                    // A new folder can land in a closed section, so selecting the video reveals it.
                    if (uploadedVideoId) {
                        router.replace(`/video-review/review/${uploadedVideoId}`);
                    }
                }} />
            </Sidebar>

            <VideoThumbnailsPanel
                open={thumbnailsOpen}
                videos={videos}
                unReadVideoIds={unReadVideoIds}
                selectedVideoId={selectedVideo?.id}
                onSelectVideo={(id) => {
                    router.replace(`/video-review/review/${id}`);
                }}
                onClose={() => setThumbnailsOpen(false)}
            />
        </>
    );
}
