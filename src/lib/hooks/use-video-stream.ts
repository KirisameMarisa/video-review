"use client";
import { useEffect } from "react";
import { usePlaybackStoreApi } from "@/stores/playback-store";
import { useSyncing } from "@/lib/sync-session";

// One stream per review screen, open whether or not this screen syncs.
export function useVideoStream(videoId: string | null) {
    const store = usePlaybackStoreApi();
    const syncing = useSyncing(videoId);

    useEffect(() => {
        if (!videoId) {
            return;
        }

        // The server holds the sync flag per connection, so toggling it reconnects.
        const query = syncing ? "?sync=1" : "";
        const source = new EventSource(`/api/v1/videos/${encodeURIComponent(videoId)}/stream${query}`);

        source.addEventListener("sync", (e) => {
            const { participants } = JSON.parse(e.data) as { participants: number };
            store.getState().setParticipants(participants);
        });

        return () => {
            source.close();
            store.getState().setParticipants(0);
        };
    }, [videoId, syncing, store]);
}
