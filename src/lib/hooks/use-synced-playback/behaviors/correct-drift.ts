import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import {
    expectedPosition, SEEK_DRIFT_S, setElementRate,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Every screen in the session, the last sender included, keeps itself at the expected position. */
export class CorrectDrift implements SyncBehavior {
    // A playing screen starts nudging past this gap and stops once back within NUDGE_STOP_S.
    private static readonly NUDGE_START_S = 0.2;
    private static readonly NUDGE_STOP_S = 0.05;
    private static readonly DRIFT_CHECK_MS = 1000;
    // Small enough that the browser's pitch-preserved audio does not give it away.
    private static readonly NUDGE_RATE = 0.05;

    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.timer = setInterval(this.check, CorrectDrift.DRIFT_CHECK_MS);
    }

    detach() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    private check = () => {
        const ctx = this.ctx;
        const { video, store } = ctx;
        const state = store.getState().syncState;
        const settled = state !== null
            && !video.paused
            && !video.seeking
            && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
            && useVideoStore.getState().selectedRevision?.id === state.revisionId;
        if (!settled) {
            this.setNudge(0);
            return;
        }

        // Past the session's end each screen has stopped at its own end.
        const expected = expectedPosition(state, video.duration);
        if (!expected.playing) {
            this.setNudge(0);
            return;
        }

        const drift = expected.time - video.currentTime;
        if (Math.abs(drift) > SEEK_DRIFT_S) {
            this.setNudge(0);
            ctx.followingSeek = true;
            video.currentTime = expected.time;
            return;
        }
        if (Math.abs(drift) > CorrectDrift.NUDGE_START_S) {
            this.setNudge(Math.sign(drift));
        } else if (Math.abs(drift) < CorrectDrift.NUDGE_STOP_S) {
            this.setNudge(0);
        } else {
            // Re-applied in case the chosen speed changed under the nudge.
            this.setNudge(this.ctx.nudge);
        }
    };

    // Only the element: the store and the speed menu keep showing the chosen rate.
    private setNudge(direction: number) {
        this.ctx.nudge = direction;
        setElementRate(this.ctx, useVideoPlayerStore.getState().playbackRate * (1 + this.ctx.nudge * CorrectDrift.NUDGE_RATE));
    }
}
