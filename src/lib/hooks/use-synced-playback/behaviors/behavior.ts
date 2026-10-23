import type { PlayerState } from "@/lib/sync-session";
import type { ReceivedSyncState, usePlaybackStoreApi } from "@/stores/playback-store";
import { useVideoStore } from "@/stores/video-store";

// Beyond this a speed nudge would take too long, so the player seeks.
export const SEEK_DRIFT_S = 1.5;
// Paused review needs the exact frame.
export const PAUSED_DRIFT_S = 0.001;
// How often a playing screen measures its drift from the session.
export const DRIFT_CHECK_MS = 1000;

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

// Called only when something changes: a resend that changes nothing must not swallow what the viewer does next.
export function markApplying(ctx: SyncContext) {
    const APPLY_SETTLE_MS = 500;
    ctx.applyingUntil = performance.now() + APPLY_SETTLE_MS;
}

// loadedmetadata too: a state received before the new source loaded is applied once it has.
export function watchSession(ctx: SyncContext, onSessionState: () => void): () => void {
    const { video, store } = ctx;
    onSessionState();
    video.addEventListener("loadedmetadata", onSessionState);
    const unsubscribe = store.subscribe((s, prev) => {
        if (s.syncState !== prev.syncState) {
            onSessionState();
        }
    });

    return () => {
        unsubscribe();
        video.removeEventListener("loadedmetadata", onSessionState);
    };
}

// Someone else's state on the shown revision, once the player knows the duration.
export function othersState(ctx: SyncContext): ReceivedSyncState | null {
    const state = ctx.store.getState().syncState;
    if (!state || isOwn(ctx, state)) {
        return null;
    }
    if (useVideoStore.getState().selectedRevision?.id !== state.revisionId) {
        return null;
    }
    if (ctx.video.readyState < HTMLMediaElement.HAVE_METADATA) {
        return null;
    }
    return state;
}

// Where a playing screen should be now; null while it loads, seeks or pauses, or after the session's end.
export function driftTarget(ctx: SyncContext): number | null {
    const { video } = ctx;
    const state = ctx.store.getState().syncState;
    const settled = state !== null
        && !video.paused
        && !video.seeking
        && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
        && useVideoStore.getState().selectedRevision?.id === state.revisionId;
    if (!settled) {
        return null;
    }

    // Past the session's end each screen has stopped at its own end.
    const expected = expectedPosition(state, video.duration);
    return expected.playing ? expected.time : null;
}
