import { describe, expect, it } from "vitest";
import { subscribeVideoStream } from "@/server/lib/video-stream";

let screens = 0;

// Records the participant names each subscriber was last told; a null name only watches.
function screen(videoId: string, name: string | null) {
    const seen: string[][] = [];
    const participant = name === null ? null : { name, email: null };
    const unsubscribe = subscribeVideoStream(videoId, `screen-${++screens}`, participant, {
        send: (event, data) => {
            if (event === "sync") {
                seen.push((data as { participants: { name: string }[] }).participants.map((p) => p.name));
            }
        },
        keepAlive: () => {},
        close: () => {},
    });

    return { unsubscribe, last: () => seen.at(-1) };
}

describe("video stream channels", () => {
    it("keeps a later session intact when a gone screen is removed again", () => {
        const first = screen("video-twice", "first");
        first.unsubscribe();

        const second = screen("video-twice", "second");
        // A late unsubscribe for a screen already gone must not drop the new channel.
        first.unsubscribe();
        const third = screen("video-twice", "third");

        expect(third.last()).toEqual(["second", "third"]);
        expect(second.last()).toEqual(["second", "third"]);
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

        expect(alice.last()).toEqual(["alice", "carol"]);
        expect(watcher.last()).toEqual(["alice", "carol"]);
    });
});
