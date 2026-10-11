"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter } from "@/ui/sidebar"
import { AccountMenu } from "@/components/setting";
import VideoUploadDialog from "@/components/dialog/video-upload";
import VideoListPanelHeader from "@/components/video-browser/header";
import { VideoSearchDialog } from "@/components/dialog/video-search";
import VideoThumbnailsPanel from "@/components/video-browser/video-thumbnails-panel";
import { BrowseTree } from "@/components/video-browser/video-tree/browse-tree";
import { OrganizeTree } from "@/components/video-browser/video-tree/organize-tree";
import { useOrganizing } from "@/components/video-browser/video-tree/organize-tree/hooks/use-organizing";
import { useFolderList } from "@/components/video-browser/video-tree/use-folder-list";
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
    const loadSeen = useVideoListStore((s) => s.loadSeen);
    const markSeen = useVideoListStore((s) => s.markSeen);
    const { videos, reloadOnViewChange, reloadOnDataChange, selectedVideo, selectedRevision } = useVideoStore();
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
    const markContext = useMarkContext();
    const canvasEditing = useDrawingStore((s) => s.canvasEditing);
    const searching = useVideoSearchStore((s) => s.isFiltering());
    const dateFiltering = useVideoDateFilterStore((s) => s.mode !== "none");
    const folderList = useFolderList(videos, { filtering: searching || dateFiltering });
    const organizing = useOrganizing();

    const openVideo = (id: string) => router.replace(`/video-review/review/${id}`);

    useEffect(() => {
        recordVisit();
        void (async () => {
            await reloadOnViewChange();
        })();
    }, [])

    // Once per page load and signed-in user; reading a video afterwards updates it in place (markRead / markSeen).
    useEffect(() => {
        loadUnread(userId).catch((reason) => console.error(reason));
        loadSeen(userId).catch((reason) => console.error(reason));
    }, [userId, loadUnread, loadSeen]);

    const selectedVideoId = selectedVideo?.id;
    const selectedRevisionNumber = selectedRevision?.revision;

    useEffect(() => {
        if (userId && selectedVideoId && selectedRevisionNumber) {
            markSeen(userId, selectedVideoId, selectedRevisionNumber).catch((reason) => console.error(reason));
        }
    }, [userId, selectedVideoId, selectedRevisionNumber, markSeen]);

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
                        {organizing ? (
                            <OrganizeTree />
                        ) : (
                            <BrowseTree
                                folderList={folderList}
                                markContext={markContext}
                                selectedVideoId={selectedVideo?.id ?? null}
                                onSelectVideo={openVideo}
                            />
                        )}
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
                        openVideo(uploadedVideoId);
                    }
                }} />
            </Sidebar>

            <VideoThumbnailsPanel
                // It shows the browsing list's open folders, which the mode does not.
                open={thumbnailsOpen && !organizing}
                videos={folderList.visible}
                markContext={markContext}
                selectedVideoId={selectedVideo?.id}
                onSelectVideo={openVideo}
                onClose={() => setThumbnailsOpen(false)}
            />
        </>
    );
}
