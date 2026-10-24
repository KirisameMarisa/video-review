import { describe, expect, it } from "vitest";
import { subscribeVideoStream, updateSyncState } from "@/server/lib/video-stream";

let screens = 0;

interface SyncEvent {
    participants: { name: string }[];
    state: { time: number } | null;
}

// Records what each subscriber was last told; a null name only watches.
function screen(videoId: string, name: string | null) {
    const seen: SyncEvent[] = [];
    const participant = name === null ? null : { name, email: null };
    const connectionId = `screen-${++screens}`;
    const unsubscribe = subscribeVideoStream(videoId, connectionId, participant, {
        send: (event, data) => {
            if (event === "sync") {
                seen.push(data as SyncEvent);
            }
        },
        keepAlive: () => {},
        close: () => {},
    });

    return { connectionId, unsubscribe, participants: () => seen.at(-1)?.participants.map((p) => p.name), state: () => seen.at(-1)?.state };
}

describe("video stream channels", () => {
    it("keeps a later session intact when a gone screen is removed again", () => {
        const first = screen("video-twice", "first");
        first.unsubscribe();

        const second = screen("video-twice", "second");
        // A late unsubscribe for a screen already gone must not drop the new channel.
        first.unsubscribe();
        const third = screen("video-twice", "third");

        expect(third.participants()).toEqual(["second", "third"]);
        expect(second.participants()).toEqual(["second", "third"]);
    });

    it("forgets a video once its last screen closes", () => {
        const viewer = screen("video-closed", null);
        const syncing = screen("video-closed", "syncing");
        viewer.unsubscribe();
        syncing.unsubscribe();

        const channels = (globalThis as { videoStreamChannels?: Map<string, unknown> }).videoStreamChannels;
        expect(channels?.has("video-closed")).toBe(false);
    });

    it("lists only syncing screens, in the order they joined", () => {
        const alice = screen("video-watch", "alice");
        const watcher = screen("video-watch", null);
        screen("video-watch", "carol");

        expect(alice.participants()).toEqual(["alice", "carol"]);
        expect(watcher.participants()).toEqual(["alice", "carol"]);
    });

    it("starts a new session from nothing once the last syncing screen leaves", () => {
        const watcher = screen("video-ended", null);
        const first = screen("video-ended", "first");
        updateSyncState("video-ended", first.connectionId, { revisionId: "rev", playing: false, time: 12, rate: 1, by: "screen" });
        first.unsubscribe();

        // The watcher keeps the channel open, so only the cleared state stops the old position coming back.
        const next = screen("video-ended", "next");
        expect(next.state()).toBeNull();
        expect(watcher.state()).toBeNull();
    });
});
