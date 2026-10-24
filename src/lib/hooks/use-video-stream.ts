"use client";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { usePlaybackStoreApi, type Participant, type ReceivedSyncState } from "@/stores/playback-store";
import { useSyncing } from "@/lib/sync-session";

const PING_MS = 20_000;

interface SyncEvent {
    participants: Participant[];
    state: (Omit<ReceivedSyncState, "anchor"> & { ageMs: number }) | null;
    presenter: Participant | null;
    presenting: boolean;
    requester: Participant | null;
    requesting: boolean;
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
            store.getState().setConnectionId(connectionId);
            clearInterval(pingTimer);
            pingTimer = setInterval(() => {
                void api.videos[":id"].stream.ping.$post({ param: { id: videoId }, json: { connectionId } }).catch(() => {});
            }, PING_MS);
        });

        source.addEventListener("sync", (e) => {
            const { participants, state, presenter, presenting, requester, requesting } = JSON.parse(e.data) as SyncEvent;
            const { setParticipants, setPresenter, setRequester, setSyncState, syncState: current, screenId } = store.getState();
            setParticipants(participants);

            // This screen already holds its own state, anchored when the change happened here.
            if (state?.by !== screenId || current?.by !== screenId) {
                setSyncState(state && { ...state, anchor: performance.now() - state.ageMs });
            }

            // After the state, so a screen that starts presenting sends the one just received.
            // A screen outside the session plays on its own, whoever presents.
            setPresenter(syncing ? presenter : null, presenting);
            setRequester(syncing ? requester : null, requesting);
        });

        return () => {
            clearInterval(pingTimer);
            source.close();
            store.getState().setParticipants([]);
            store.getState().setSyncState(null);
            store.getState().setConnectionId(null);
            store.getState().setPresenter(null, false);
            store.getState().setRequester(null, false);
        };
    }, [videoId, syncing, store]);
}
