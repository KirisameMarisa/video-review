"use client";
import { useEffect } from "react";
import { useSyncing } from "@/lib/sync-session";
import { usePlaybackStoreApi } from "@/stores/playback-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import type { SyncBehavior, SyncContext } from "@/lib/hooks/use-synced-playback/behaviors/behavior";
import { CorrectDrift } from "@/lib/hooks/use-synced-playback/behaviors/correct-drift";
import { FollowSession } from "@/lib/hooks/use-synced-playback/behaviors/follow-session";
import { SendViewerAction } from "@/lib/hooks/use-synced-playback/behaviors/send-viewer-action";

// Follows the sync session's state, and sends this viewer's play, pause, seek and speed changes.
export function useSyncedPlayback(videoId: string | null) {
    const store = usePlaybackStoreApi();
    const syncing = useSyncing(videoId);
    const video = useVideoReviewStore((s) => s.videoRefElement);

    useEffect(() => {
        if (!syncing || !video || !videoId) {
            return;
        }

        const ctx: SyncContext = {
            video,
            videoId,
            store,
            applyingUntil: 0,
            followingSeek: false,
            ownRateChanges: 0,
            nudge: 0,
        };
        const behaviors: SyncBehavior[] = [new FollowSession(ctx), new CorrectDrift(ctx), new SendViewerAction(ctx)];

        for (const behavior of behaviors) {
            behavior.attach();
        }

        return () => {
            for (const behavior of behaviors) {
                behavior.detach();
            }
            video.playbackRate = useVideoPlayerStore.getState().playbackRate;
        };
    }, [syncing, video, videoId, store]);
}
