"use client";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { usePlaybackStoreApi, type Participant, type ReceivedSyncState } from "@/stores/playback-store";
import { useSyncing } from "@/lib/sync-session";

const PING_MS = 20_000;

interface SyncEvent {
    participants: Participant[];
    state: (Omit<ReceivedSyncState, "anchor"> & { ageMs: number }) | null;
}

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

        // The server drops a connection that stops pinging, which is how it notices a closed tab behind a proxy.
        let pingTimer: ReturnType<typeof setInterval> | undefined;
        source.addEventListener("hello", (e) => {
            const { connectionId } = JSON.parse(e.data) as { connectionId: string };
            clearInterval(pingTimer);
            pingTimer = setInterval(() => {
                void api.videos[":id"].stream.ping.$post({ param: { id: videoId }, json: { connectionId } }).catch(() => {});
            }, PING_MS);
        });

        source.addEventListener("sync", (e) => {
            const { participants, state } = JSON.parse(e.data) as SyncEvent;
            const { setParticipants, setSyncState, syncState: current, screenId } = store.getState();
            setParticipants(participants);

            // This screen already holds its own state, anchored when the change happened here.
            if (state?.by === screenId && current?.by === screenId) {
                return;
            }

            setSyncState(state && { ...state, anchor: performance.now() - state.ageMs });
        });

        return () => {
            clearInterval(pingTimer);
            source.close();
            store.getState().setParticipants([]);
            store.getState().setSyncState(null);
        };
    }, [videoId, syncing, store]);
}
