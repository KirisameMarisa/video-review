import {
    driftTarget, DRIFT_CHECK_MS, expectedPosition, othersState,
    PAUSED_DRIFT_S, SEEK_DRIFT_S, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Every seek the sync makes: following the session, a large drift, and catching up after buffering. */
export class SeekPosition implements SyncBehavior {
    private stopWatching: (() => void) | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    // A follower that seeked while playing starts late by however long the seek buffered.
    private catchUpPending = false;
    private seekStartedAt = 0;
    // The catch-up seeks this far past the session, expecting the same buffering delay again.
    private catchUpLeadS = 0;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        const { video } = this.ctx;
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
        video.addEventListener("play", this.onPlay);
        video.addEventListener("playing", this.onPlaying);
        this.timer = setInterval(this.onDriftCheck, DRIFT_CHECK_MS);
    }

    detach() {
        const { video } = this.ctx;
        this.stopWatching?.();
        video.removeEventListener("play", this.onPlay);
        video.removeEventListener("playing", this.onPlaying);

        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    private onSessionState = () => {
        const ctx = this.ctx;
        const { video, store } = ctx;
        const state = othersState(ctx);
        if (!state) {
            return;
        }

        const expected = expectedPosition(state, video.duration);
        const drift = Math.abs(video.currentTime - expected.time);
        // Smaller drifts while playing are left to the drift check's speed nudge.
        if (expected.playing && drift > SEEK_DRIFT_S) {
            // Only one catch-up per received state, so a slow connection cannot seek forever.
            this.catchUpPending = this.catchUpLeadS === 0;
            this.seekStartedAt = performance.now();
            video.currentTime = Math.min(expected.time + this.catchUpLeadS * state.rate, video.duration);
        }

        if (!expected.playing && drift > PAUSED_DRIFT_S) {
            // The timeline path keeps the shown time and the seek bar in step while paused.
            store.getState().setTimelineTime(expected.time);
        }
    };

    // Pressing play re-applies the session, so a follower catches up instead of pulling everyone back to here.
    private onPlay = () => {
        this.onSessionState();
    };

    private onPlaying = () => {
        if (!this.catchUpPending) {
            return;
        }

        this.catchUpPending = false;
        this.catchUpLeadS = (performance.now() - this.seekStartedAt) / 1000;
        this.onSessionState();
        this.catchUpLeadS = 0;
    };

    // Every screen, the last sender included, jumps back when it drifts too far for a nudge.
    private onDriftCheck = () => {
        const target = driftTarget(this.ctx);
        if (target === null || Math.abs(target - this.ctx.video.currentTime) <= SEEK_DRIFT_S) {
            return;
        }

        this.ctx.video.currentTime = target;
    };
}
