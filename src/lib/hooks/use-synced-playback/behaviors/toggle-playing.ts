import {
    expectedPosition, othersState, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Plays or pauses with the session. */
export class TogglePlaying implements SyncBehavior {
    private stopWatching: (() => void) | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
    }

    detach() {
        this.stopWatching?.();
    }

    private onSessionState = () => {
        const state = othersState(this.ctx);
        if (!state) {
            return;
        }

        const playback = this.ctx.store.getState();
        const expected = expectedPosition(state, this.ctx.video.duration);
        if (playback.isPlaying !== expected.playing) {
            playback.setIsPlaying(expected.playing);
        }
    };
}
