import { useVideoPlayerStore } from "@/stores/video-player-store";
import {
    othersState, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Plays at the session's speed, and gives the viewer's own speed back when the session ends. */
export class AdjustRate implements SyncBehavior {
    private stopWatching: (() => void) | null = null;
    // The speed is a saved setting, so the session's is lent only while it lasts.
    private ownRate = 1;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.ownRate = useVideoPlayerStore.getState().playbackRate;
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
    }

    detach() {
        this.stopWatching?.();
        useVideoPlayerStore.getState().setPlaybackRate(this.ownRate);
    }

    private onSessionState = () => {
        const state = othersState(this.ctx);
        if (!state || useVideoPlayerStore.getState().playbackRate === state.rate) {
            return;
        }

        useVideoPlayerStore.getState().setPlaybackRate(state.rate);
    };
}
