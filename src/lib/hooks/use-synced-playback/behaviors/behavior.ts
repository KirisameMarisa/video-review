import type { PlayerState } from "@/lib/sync-session";
import type { ReceivedSyncState, usePlaybackStoreApi } from "@/stores/playback-store";

// Beyond this a speed nudge would take too long, so the player seeks.
export const SEEK_DRIFT_S = 1.5;
// Paused review needs the exact frame.
export const PAUSED_DRIFT_S = 0.001;

/** Everything the behaviors share for one sync session on one player. */
export interface SyncContext {
    video: HTMLVideoElement;
    videoId: string;
    store: ReturnType<typeof usePlaybackStoreApi>;
    // Events the player fires while applying someone else's action are not this viewer's own.
    applyingUntil: number;
    // A seek this hook started; its seeked event is not the viewer's, however long the seek takes.
    followingSeek: boolean;
    // Rate changes this hook made on the element; their ratechange events are not the viewer's.
    ownRateChanges: number;
    // -1 slows down, 1 speeds up; kept between checks so the gap closes before it stops.
    nudge: number;
}

export interface SyncBehavior {
    attach(): void;
    detach(): void;
}

// Where the session is now; a session that played past the end has stopped there.
export function expectedPosition(state: ReceivedSyncState, duration: number): { time: number; playing: boolean } {
    if (!state.playing) {
        return { time: Math.min(state.time, duration), playing: false };
    }

    const time = state.time + ((performance.now() - state.anchor) / 1000) * state.rate;
    if (time >= duration) {
        return { time: duration, playing: false };
    }
    return { time, playing: true };
}

export function matchesSession(player: PlayerState, state: ReceivedSyncState, duration: number): boolean {
    // While playing, closer than this counts as the same position when deciding whether to send.
    const PLAYING_DRIFT_S = 0.5;
    const expected = expectedPosition(state, duration);
    const drift = expected.playing ? PLAYING_DRIFT_S : PAUSED_DRIFT_S;
    return player.revisionId === state.revisionId
        && player.playing === expected.playing
        && player.rate === state.rate
        && Math.abs(player.time - expected.time) <= drift;
}

export function isOwn(ctx: SyncContext, state: ReceivedSyncState): boolean {
    return state.by === ctx.store.getState().screenId;
}

export function othersPlaying(ctx: SyncContext): boolean {
    const state = ctx.store.getState().syncState;
    return state !== null && !isOwn(ctx, state) && expectedPosition(state, ctx.video.duration).playing;
}

export function isViewerAction(ctx: SyncContext): boolean {
    // Without the API every event counts as the viewer's; the other checks still stop loops.
    const viewerActed = navigator.userActivation?.isActive ?? true;
    return performance.now() >= ctx.applyingUntil
        && viewerActed
        // Reaching the end pauses every screen on its own.
        && !ctx.video.ended;
}

export function setElementRate(ctx: SyncContext, rate: number) {
    if (ctx.video.playbackRate === rate) {
        return;
    }
    ctx.ownRateChanges++;
    ctx.video.playbackRate = rate;
}
