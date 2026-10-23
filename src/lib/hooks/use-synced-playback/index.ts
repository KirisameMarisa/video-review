"use client";
import { useEffect } from "react";
import { useSyncing } from "@/lib/sync-session";
import { usePlaybackStoreApi } from "@/stores/playback-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import type { SyncBehavior, SyncContext } from "@/lib/hooks/use-synced-playback/behaviors/behavior";
import { AdjustRate } from "@/lib/hooks/use-synced-playback/behaviors/adjust-rate";
import { SeekPosition } from "@/lib/hooks/use-synced-playback/behaviors/seek-position";
import { SendViewerAction } from "@/lib/hooks/use-synced-playback/behaviors/send-viewer-action";
import { SwitchRevision } from "@/lib/hooks/use-synced-playback/behaviors/switch-revision";
import { TogglePlaying } from "@/lib/hooks/use-synced-playback/behaviors/toggle-playing";

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
        };
        // SwitchRevision last: right after the switch the old source would pass as the new revision to the others.
        const behaviors: SyncBehavior[] = [
            new SeekPosition(ctx),
            new TogglePlaying(ctx),
            new AdjustRate(ctx),
            new SwitchRevision(ctx),
            new SendViewerAction(ctx),
        ];

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
