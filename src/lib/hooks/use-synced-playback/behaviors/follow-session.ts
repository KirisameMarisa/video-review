import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import {
    expectedPosition, isOwn, isViewerAction, othersPlaying, PAUSED_DRIFT_S, SEEK_DRIFT_S, setElementRate,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Applies the session's state received from another screen. */
export class FollowSession implements SyncBehavior {
    private static readonly APPLY_SETTLE_MS = 500;

    private unsubscribe: (() => void) | null = null;
    // A follower that seeked while playing starts late by however long the seek buffered.
    private catchUpPending = false;
    private seekStartedAt = 0;
    // The catch-up seeks this far past the session, expecting the same buffering delay again.
    private catchUpLeadS = 0;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        const { video, store } = this.ctx;
        this.follow();
        video.addEventListener("loadedmetadata", this.follow);
        video.addEventListener("play", this.onPlay);
        video.addEventListener("playing", this.onPlaying);
        // Re-run on every received state; the listeners read the store when they fire.
        this.unsubscribe = store.subscribe((s, prev) => {
            if (s.syncState !== prev.syncState) {
                this.follow();
            }
        });
    }

    detach() {
        const { video } = this.ctx;
        this.unsubscribe?.();
        video.removeEventListener("loadedmetadata", this.follow);
        video.removeEventListener("play", this.onPlay);
        video.removeEventListener("playing", this.onPlaying);
    }

    private follow = () => {
        const ctx = this.ctx;
        const { video, store } = ctx;
        const state = store.getState().syncState;
        if (!state || isOwn(ctx, state)) {
            return;
        }

        const { selectedRevision, revisions, selectVideoRevision } = useVideoStore.getState();
        if (selectedRevision?.id !== state.revisionId) {
            const target = revisions.find((r) => r.id === state.revisionId);
            if (target) {
                ctx.applyingUntil = performance.now() + FollowSession.APPLY_SETTLE_MS;
                selectVideoRevision(target);
            }
            // The new source's loadedmetadata follows again.
            return;
        }
        if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
            return;
        }

        const playback = store.getState();
        const expected = expectedPosition(state, video.duration);
        // Smaller gaps while playing are left to the drift check's speed nudge.
        const seekPlaying = expected.playing && Math.abs(video.currentTime - expected.time) > SEEK_DRIFT_S;
        const seekPaused = !expected.playing && Math.abs(video.currentTime - expected.time) > PAUSED_DRIFT_S;
        const togglePlaying = playback.isPlaying !== expected.playing;
        const changeRate = useVideoPlayerStore.getState().playbackRate !== state.rate;
        // A resend that changes nothing must not swallow what the viewer does next.
        if (!seekPlaying && !seekPaused && !togglePlaying && !changeRate) {
            return;
        }

        ctx.applyingUntil = performance.now() + FollowSession.APPLY_SETTLE_MS;
        if (seekPlaying) {
            ctx.followingSeek = true;
            // Only one catch-up per follow, so a slow connection cannot seek forever.
            this.catchUpPending = this.catchUpLeadS === 0;
            this.seekStartedAt = performance.now();
            video.currentTime = Math.min(expected.time + this.catchUpLeadS * state.rate, video.duration);
        }
        if (seekPaused) {
            // The timeline path keeps the shown time and the seek bar in step while paused.
            ctx.followingSeek = true;
            playback.setTimelineTime(expected.time);
        }
        if (togglePlaying) {
            playback.setIsPlaying(expected.playing);
        }
        // The element too: a source load can reset it while the store already holds the speed.
        if (changeRate) {
            useVideoPlayerStore.getState().setPlaybackRate(state.rate);
            ctx.nudge = 0;
            setElementRate(ctx, state.rate);
        }
    };

    // Pressing play while the session plays means catching up, not pulling everyone back to here.
    private onPlay = () => {
        if (!isViewerAction(this.ctx) || !useVideoStore.getState().selectedRevision || !othersPlaying(this.ctx)) {
            return;
        }

        this.follow();
    };

    private onPlaying = () => {
        if (!this.catchUpPending) {
            return;
        }

        this.catchUpPending = false;
        this.catchUpLeadS = (performance.now() - this.seekStartedAt) / 1000;
        this.follow();
        this.catchUpLeadS = 0;
    };
}
