"use client";
import { useEffect } from "react";
import { postSyncState, useSyncing, type PlayerState } from "@/lib/sync-session";
import { usePlaybackStoreApi, type ReceivedSyncState } from "@/stores/playback-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useVideoStore } from "@/stores/video-store";

// While playing, closer than this counts as the same position when deciding whether to send.
const PLAYING_DRIFT_S = 0.5;
// Beyond this a speed nudge would take too long, so the player seeks.
const SEEK_DRIFT_S = 1.5;
// A playing screen starts nudging past this gap and stops once back within NUDGE_STOP_S.
const NUDGE_START_S = 0.2;
const NUDGE_STOP_S = 0.05;
// Small enough that the browser's pitch-preserved audio does not give it away.
const NUDGE_RATE = 0.05;
const DRIFT_CHECK_MS = 1000;
// Paused review needs the exact frame.
const PAUSED_DRIFT_S = 0.001;
// Events the player fires while applying someone else's action are not this viewer's own.
const APPLY_SETTLE_MS = 500;

// Where the session is now; a session that played past the end has stopped there.
function expectedPosition(state: ReceivedSyncState, duration: number): { time: number; playing: boolean } {
    if (!state.playing) {
        return { time: Math.min(state.time, duration), playing: false };
    }

    const time = state.time + ((performance.now() - state.anchor) / 1000) * state.rate;
    if (time >= duration) {
        return { time: duration, playing: false };
    }
    return { time, playing: true };
}

function matchesSession(player: PlayerState, state: ReceivedSyncState, duration: number): boolean {
    const expected = expectedPosition(state, duration);
    const drift = expected.playing ? PLAYING_DRIFT_S : PAUSED_DRIFT_S;
    return player.revisionId === state.revisionId
        && player.playing === expected.playing
        && player.rate === state.rate
        && Math.abs(player.time - expected.time) <= drift;
}

// Without the API every event counts as the viewer's; the other checks still stop loops.
function viewerActed(): boolean {
    return navigator.userActivation?.isActive ?? true;
}

// Follows the sync session's state, and sends this viewer's play, pause, seek and speed changes.
export function useSyncedPlayback(videoId: string | null) {
    const store = usePlaybackStoreApi();
    const syncing = useSyncing(videoId);
    const video = useVideoReviewStore((s) => s.videoRefElement);

    useEffect(() => {
        if (!syncing || !video || !videoId) {
            return;
        }

        let closed = false;
        let applyingUntil = 0;
        // A seek this hook started; its seeked event is not the viewer's, however long the seek takes.
        let followingSeek = false;
        // A follower that seeked while playing starts late by however long the seek buffered.
        let catchUpPending = false;
        let seekStartedAt = 0;
        // The catch-up seeks this far past the session, expecting the same buffering delay again.
        let catchUpLeadS = 0;
        // One request at a time; a seek drag sends only its latest position.
        let inFlight = false;
        let queued: PlayerState | null = null;
        // -1 slows down, 1 speeds up; kept between checks so the gap closes before it stops.
        let nudge = 0;
        // Rate changes this hook made on the element; their ratechange events are not the viewer's.
        let ownRateChanges = 0;

        const isOwn = (state: ReceivedSyncState) => state.by === store.getState().screenId;

        const setElementRate = (rate: number) => {
            if (video.playbackRate === rate) {
                return;
            }
            ownRateChanges++;
            video.playbackRate = rate;
        };

        // Only the element: the store and the speed menu keep showing the chosen rate.
        const setNudge = (direction: number) => {
            nudge = direction;
            setElementRate(useVideoPlayerStore.getState().playbackRate * (1 + nudge * NUDGE_RATE));
        };

        const follow = () => {
            const state = store.getState().syncState;
            if (!state || isOwn(state)) {
                return;
            }

            const { selectedRevision, revisions, selectVideoRevision } = useVideoStore.getState();
            if (selectedRevision?.id !== state.revisionId) {
                const target = revisions.find((r) => r.id === state.revisionId);
                if (target) {
                    applyingUntil = performance.now() + APPLY_SETTLE_MS;
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

            applyingUntil = performance.now() + APPLY_SETTLE_MS;
            if (seekPlaying) {
                followingSeek = true;
                // Only one catch-up per follow, so a slow connection cannot seek forever.
                catchUpPending = catchUpLeadS === 0;
                seekStartedAt = performance.now();
                video.currentTime = Math.min(expected.time + catchUpLeadS * state.rate, video.duration);
            }
            if (seekPaused) {
                // The timeline path keeps the shown time and the seek bar in step while paused.
                followingSeek = true;
                playback.setTimelineTime(expected.time);
            }
            if (togglePlaying) {
                playback.setIsPlaying(expected.playing);
            }
            // The element too: a source load can reset it while the store already holds the speed.
            if (changeRate) {
                useVideoPlayerStore.getState().setPlaybackRate(state.rate);
                nudge = 0;
                setElementRate(state.rate);
            }
        };

        // Every screen in the session, the last sender included, keeps itself at the expected position.
        const correctDrift = () => {
            const state = store.getState().syncState;
            const settled = state !== null
                && !video.paused
                && !video.seeking
                && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
                && useVideoStore.getState().selectedRevision?.id === state.revisionId;
            if (!settled) {
                setNudge(0);
                return;
            }

            // Past the session's end each screen has stopped at its own end.
            const expected = expectedPosition(state, video.duration);
            if (!expected.playing) {
                setNudge(0);
                return;
            }

            const drift = expected.time - video.currentTime;
            if (Math.abs(drift) > SEEK_DRIFT_S) {
                setNudge(0);
                followingSeek = true;
                video.currentTime = expected.time;
                return;
            }
            if (Math.abs(drift) > NUDGE_START_S) {
                setNudge(Math.sign(drift));
            } else if (Math.abs(drift) < NUDGE_STOP_S) {
                setNudge(0);
            } else {
                // Re-applied in case the chosen speed changed under the nudge.
                setNudge(nudge);
            }
        };

        const postPlayerState = async (player: PlayerState) => {
            if (inFlight) {
                queued = player;
                return;
            }

            inFlight = true;
            await postSyncState(videoId, player, store.getState().screenId);
            inFlight = false;

            const next = queued;
            queued = null;
            if (next && !closed) {
                void postPlayerState(next);
            }
        };

        const readPlayerState = (): PlayerState | null => {
            const selected = useVideoStore.getState().selectedRevision;
            if (!selected) {
                return null;
            }
            // The store's rate: the element may be running nudged.
            const rate = useVideoPlayerStore.getState().playbackRate;
            return { revisionId: selected.id, playing: !video.paused, time: video.currentTime, rate };
        };

        const onViewerAction = (e: Event) => {
            if (e.type === "ratechange" && ownRateChanges > 0) {
                ownRateChanges--;
                return;
            }
            if (e.type === "seeked" && followingSeek) {
                followingSeek = false;
                return;
            }
            // Reaching the end pauses every screen on its own.
            if (performance.now() < applyingUntil || !viewerActed() || video.ended) {
                return;
            }
            const player = readPlayerState();
            if (!player) {
                return;
            }

            const state = store.getState().syncState;
            const othersPlaying = state !== null && !isOwn(state) && expectedPosition(state, video.duration).playing;
            // Pressing play while the session plays means catching up, not pulling everyone back to here.
            if (e.type === "play" && othersPlaying) {
                follow();
                return;
            }
            if (state && matchesSession(player, state, video.duration)) {
                return;
            }
            void postPlayerState(player);
        };

        const onPlaying = () => {
            if (!catchUpPending) {
                return;
            }

            catchUpPending = false;
            catchUpLeadS = (performance.now() - seekStartedAt) / 1000;
            follow();
            catchUpLeadS = 0;
        };

        follow();
        const events = ["play", "pause", "seeked", "ratechange"];
        for (const name of events) {
            video.addEventListener(name, onViewerAction);
        }
        video.addEventListener("loadedmetadata", follow);
        video.addEventListener("playing", onPlaying);
        const driftTimer = setInterval(correctDrift, DRIFT_CHECK_MS);

        // Re-run on every received state; the listeners above read the store when they fire.
        const unsubscribe = store.subscribe((s, prev) => {
            if (s.syncState !== prev.syncState) {
                follow();
            }
        });

        return () => {
            closed = true;
            queued = null;
            unsubscribe();
            clearInterval(driftTimer);
            video.playbackRate = useVideoPlayerStore.getState().playbackRate;
            for (const name of events) {
                video.removeEventListener(name, onViewerAction);
            }
            video.removeEventListener("loadedmetadata", follow);
            video.removeEventListener("playing", onPlaying);
        };
    }, [syncing, video, videoId, store]);
}
