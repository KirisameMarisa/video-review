import { describe, expect, it } from "vitest";
import { subscribeVideoStream } from "@/server/lib/video-stream";

// Records the participant count each subscriber was last told.
function screen(videoId: string, syncing: boolean) {
    const seen: number[] = [];
    const unsubscribe = subscribeVideoStream(videoId, syncing, (event, data) => {
        if (event === "sync") {
            seen.push((data as { participants: number }).participants);
        }
    });

    return { unsubscribe, last: () => seen.at(-1) };
}

describe("video stream channels", () => {
    it("keeps a later session intact when an old screen unsubscribes twice", () => {
        const first = screen("video-twice", true);
        first.unsubscribe();

        const second = screen("video-twice", true);
        // The stream's abort and its finally both unsubscribe; the late one must not drop the new channel.
        first.unsubscribe();
        const third = screen("video-twice", true);

        expect(third.last()).toBe(2);
        expect(second.last()).toBe(2);
    });

    it("forgets a video once its last screen closes", () => {
        const viewer = screen("video-closed", false);
        const syncing = screen("video-closed", true);
        viewer.unsubscribe();
        syncing.unsubscribe();

        const channels = (globalThis as { videoStreamChannels?: Map<string, unknown> }).videoStreamChannels;
        expect(channels?.has("video-closed")).toBe(false);
    });
});
