import { postSyncState, type PlayerState } from "@/lib/sync-session";
import type { ReceivedSyncState } from "@/stores/playback-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import {
    expectedPosition, PAUSED_DRIFT_S,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Sends this viewer's play, pause, seek, speed and revision changes to the session. */
export class SendViewerAction implements SyncBehavior {
    private unsubscribes: (() => void)[] = [];
    private inFlight = false;
    private queued: PlayerState | null = null;
    // What this screen holds as the session while its send is on the way, and the state it replaced.
    private held: ReceivedSyncState | null = null;
    private replaced: ReceivedSyncState | null = null;

    constructor(private readonly ctx: SyncContext) {}

    // The sync writes only the session's values to the stores, so a change that differs from the session is the viewer's.
    attach() {
        this.unsubscribes = [
            this.ctx.store.subscribe((s, prev) => {
                if (s.isPlaying !== prev.isPlaying) {
                    this.onPlayingChange(s.isPlaying);
                }
                if (s.timelineTime !== prev.timelineTime && s.timelineTime !== null) {
                    this.onTimeChange(s.timelineTime);
                }
            }),
            useVideoPlayerStore.subscribe((s, prev) => {
                if (s.playbackRate !== prev.playbackRate) {
                    this.onRateChange(s.playbackRate);
                }
            }),
            useVideoStore.subscribe((s, prev) => {
                if (s.selectedRevision && s.selectedRevision.id !== prev.selectedRevision?.id) {
                    this.onRevisionChange(s.selectedRevision.id);
                }
            }),
        ];
    }

    detach() {
        this.queued = null;

        for (const unsubscribe of this.unsubscribes) {
            unsubscribe();
        }
    }

    private onPlayingChange(playing: boolean) {
        const { video, store } = this.ctx;
        // Reaching the end pauses every screen on its own.
        if (!playing && video.ended) {
            return;
        }

        const state = store.getState().syncState;
        if (state && expectedPosition(state, video.duration).playing === playing) {
            return;
        }
        // Play at the end starts over from the top, though the element still reports the end.
        this.send(playing && video.ended ? { playing, time: 0 } : { playing });
    }

    private onTimeChange(time: number) {
        // While playing, closer than this counts as the same position.
        const PLAYING_DRIFT_S = 0.5;
        const state = this.ctx.store.getState().syncState;
        if (state) {
            const expected = expectedPosition(state, this.ctx.video.duration);
            if (Math.abs(time - expected.time) <= (expected.playing ? PLAYING_DRIFT_S : PAUSED_DRIFT_S)) {
                return;
            }
        }

        this.send({ time });
    }

    private onRateChange(rate: number) {
        if (this.ctx.store.getState().syncState?.rate === rate) {
            return;
        }

        this.send({ rate });
    }

    // A new revision opens paused at its start.
    private onRevisionChange(revisionId: string) {
        if (this.ctx.store.getState().syncState?.revisionId === revisionId) {
            return;
        }

        this.send({ revisionId, playing: false, time: 0 });
    }

    private send(change: Partial<PlayerState>) {
        const { video, store, videoId } = this.ctx;
        const settingUp = video.readyState < HTMLMediaElement.HAVE_METADATA;
        // A page nobody has touched yet cannot hold a viewer's change; a refused autoplay pauses it on its own.
        const untouched = !(navigator.userActivation?.hasBeenActive ?? true);
        if (settingUp || untouched) {
            return;
        }

        const selected = useVideoStore.getState().selectedRevision;
        if (!selected) {
            return;
        }

        const player: PlayerState = {
            revisionId: selected.id,
            playing: store.getState().isPlaying,
            time: video.currentTime,
            // The store's rate: the element may be running nudged.
            rate: useVideoPlayerStore.getState().playbackRate,
            ...change,
        };

        const current = store.getState().syncState;
        if (current !== this.held) {
            this.replaced = current;
        }
        // Held as the session at once, so the next change is compared with it rather than with the state it replaced.
        this.held = { ...player, by: store.getState().screenId, anchor: performance.now() };
        store.getState().setSyncState(this.held);

        // One request at a time; a seek drag sends only its latest position.
        const sendState = async (next: PlayerState) => {
            if (this.inFlight) {
                this.queued = next;
                return;
            }

            this.inFlight = true;
            const sent = await postSyncState(videoId, next, store.getState().screenId);
            this.inFlight = false;

            // A send that never arrived leaves the others where they were, so this screen goes back to following them.
            if (!sent && !this.queued && store.getState().syncState === this.held) {
                store.getState().setSyncState(this.replaced);
            }

            const queued = this.queued;
            this.queued = null;
            // detach clears the queue, so nothing is sent after the session ends.
            if (queued) {
                void sendState(queued);
            }
        };
        void sendState(player);
    }
}
