"use client";
import { useEffect } from "react";
import { useSyncing } from "@/lib/sync-session";
import { usePlaybackStoreApi } from "@/stores/playback-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import type { SyncBehavior, SyncContext } from "@/lib/hooks/use-synced-playback/behaviors/behavior";
import { AdjustRate } from "@/lib/hooks/use-synced-playback/behaviors/adjust-rate";
import { SeekPosition } from "@/lib/hooks/use-synced-playback/behaviors/seek-position";
import { SendViewerAction } from "@/lib/hooks/use-synced-playback/behaviors/send-viewer-action";
import { SwitchRevision } from "@/lib/hooks/use-synced-playback/behaviors/switch-revision";
import { TogglePlaying } from "@/lib/hooks/use-synced-playback/behaviors/toggle-playing";

// Follows the sync session's state, and sends this viewer's play, pause, seek, speed and revision changes.
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
        };
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
            // In reverse, so the sending stops first and nothing undone on the way out is sent.
            for (const behavior of [...behaviors].reverse()) {
                behavior.detach();
            }
        };
    }, [syncing, video, videoId, store]);
}
