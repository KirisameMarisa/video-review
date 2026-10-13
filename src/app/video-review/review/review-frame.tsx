"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import VideoSidePanel from "@/components/video-side-panel";
import VideoCommentContent from "@/components/video-side-panel/panels/video-comment-panel/content";
import VideoListPanel from "@/components/video-browser";
import { useIsPhone } from "@/lib/hooks/use-is-phone";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlaybackStoreProvider } from "@/stores/playback-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";

export function ReviewFrame({ children }: { children: ReactNode }) {
    const listPanelOpen = useVideoPlayerStore((s) => s.listPanelOpen);
    const setListPanelOpen = useVideoPlayerStore((s) => s.setListPanelOpen);
    const sidePanelOpen = useVideoPlayerStore((s) => s.sidePanelOpen);
    const isPhone = useIsPhone();

    return (
        <SidebarProvider open={listPanelOpen} onOpenChange={setListPanelOpen}>
            <PlaybackStoreProvider>
                <VideoListPanel />
                {isPhone ? (
                    // A phone stacks the player over the comments; the side panel's tabs and filters stay desktop-only.
                    <div data-slot="review-main" className="w-screen h-screen flex flex-col">
                        <div className="shrink-0 min-w-0">
                            {children}
                        </div>
                        <div className="flex-1 min-h-0 min-w-0 border-t">
                            <VideoCommentContent />
                        </div>
                    </div>
                ) : (
                    <div data-slot="review-main" className={cn("@container w-screen h-screen grid", sidePanelOpen ? "review-columns" : "review-columns-closed")}>
                        <div className="flex flex-col min-h-0 min-w-0 w-full h-full border-r">
                            {children}
                        </div>
                        {/* Kept rather than removed, so a comment being written survives closing it. */}
                        <div inert={!sidePanelOpen} className="min-h-0 min-w-0 h-full overflow-hidden">
                            <div className="side-panel-width h-full flex flex-col border-l">
                                <VideoSidePanel />
                            </div>
                        </div>
                    </div>
                )}
            </PlaybackStoreProvider>
        </SidebarProvider>
    );
}
