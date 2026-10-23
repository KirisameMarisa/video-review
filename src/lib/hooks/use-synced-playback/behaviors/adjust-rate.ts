import { useVideoPlayerStore } from "@/stores/video-player-store";
import {
    driftTarget, DRIFT_CHECK_MS, othersState, SEEK_DRIFT_S, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Plays at the session's speed, nudged slightly faster or slower to close a small drift. */
export class AdjustRate implements SyncBehavior {
    // A playing screen starts nudging past this drift and stops once back within NUDGE_STOP_S.
    private static readonly NUDGE_START_S = 0.2;
    private static readonly NUDGE_STOP_S = 0.05;
    // Small enough that the browser's pitch-preserved audio does not give it away.
    private static readonly NUDGE_RATE = 0.05;

    private stopWatching: (() => void) | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    // -1 slows down, 1 speeds up; kept between checks so the drift closes before it stops.
    private nudge = 0;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
        this.timer = setInterval(this.onDriftCheck, DRIFT_CHECK_MS);
    }

    detach() {
        this.stopWatching?.();

        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    private onSessionState = () => {
        const state = othersState(this.ctx);
        if (!state || useVideoPlayerStore.getState().playbackRate === state.rate) {
            return;
        }

        useVideoPlayerStore.getState().setPlaybackRate(state.rate);
        // The element too: a source load can reset it while the store already holds the speed.
        this.nudge = 0;
        this.ctx.video.playbackRate = state.rate;
    };

    // Every screen, the last sender included, nudges itself back to the expected position.
    private onDriftCheck = () => {
        const target = driftTarget(this.ctx);
        if (target === null) {
            this.setNudge(0);
            return;
        }

        const drift = target - this.ctx.video.currentTime;
        // A drift this large is the seek's to close.
        if (Math.abs(drift) > SEEK_DRIFT_S) {
            this.setNudge(0);
            return;
        }

        if (Math.abs(drift) > AdjustRate.NUDGE_START_S) {
            this.setNudge(Math.sign(drift));
        } else if (Math.abs(drift) < AdjustRate.NUDGE_STOP_S) {
            this.setNudge(0);
        } else {
            // Re-applied in case the chosen speed changed under the nudge.
            this.setNudge(this.nudge);
        }
    };

    // Only the element: the store and the speed menu keep showing the chosen rate.
    private setNudge(direction: number) {
        this.nudge = direction;
        this.ctx.video.playbackRate = useVideoPlayerStore.getState().playbackRate * (1 + this.nudge * AdjustRate.NUDGE_RATE);
    }
}
