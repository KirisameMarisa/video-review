import { postSyncState, type PlayerState } from "@/lib/sync-session";
import type { ReceivedSyncState } from "@/stores/playback-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import {
    expectedPosition, PAUSED_DRIFT_SEC, PLAYING_DRIFT_SEC,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Sends this viewer's play, pause, seek, speed and revision changes to the session as they happen. */
export class SendViewerAction implements SyncBehavior {
    private unsubscribes: (() => void)[] = [];

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
                // Gives a locked screen somewhere to go back to before the presenter's first action.
                if (s.presenting && !prev.presenting) {
                    this.send({});
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
        // A pause right after no click or key is not the viewer's: the OS, unplugged earphones or a refused play.
        if (!playing && !(navigator.userActivation?.isActive ?? true)) {
            return;
        }

        const state = store.getState().syncState;
        if (state && expectedPosition(state, video.duration).playing === playing) {
            return;
        }

        if (playing) {
            // Play at the end starts over from the top, though the element still reports the end.
            this.send(video.ended ? { playing, time: 0 } : { playing });
        } else {
            // Everyone stops on the frame the viewer stopped on.
            this.send({ playing, time: video.currentTime });
        }
    }

    private onTimeChange(time: number) {
        const state = this.ctx.store.getState().syncState;
        if (state) {
            const expected = expectedPosition(state, this.ctx.video.duration);
            if (Math.abs(time - expected.time) <= (expected.playing ? PLAYING_DRIFT_SEC : PAUSED_DRIFT_SEC)) {
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

    // A new revision opens paused where it was.
    private onRevisionChange(revisionId: string) {
        const { video, store } = this.ctx;
        if (store.getState().syncState?.revisionId === revisionId) {
            return;
        }

        // The page pauses a playing screen right after the pick, and that pause sends the new revision at its stopped frame.
        if (!video.paused) {
            return;
        }

        this.send({ revisionId, playing: false });
    }

    // The session with the viewer's change on top, on the revision this screen shows; the first change of a session takes this screen's state.
    private send(change: Partial<PlayerState>) {
        const { video, store, videoId } = this.ctx;
        const settingUp = video.readyState < HTMLMediaElement.HAVE_METADATA;
        // A page nobody has touched yet cannot hold a viewer's change; a refused autoplay pauses it on its own.
        const untouched = !(navigator.userActivation?.hasBeenActive ?? true);
        if (settingUp || untouched) {
            return;
        }

        const { syncState: current, connectionId } = store.getState();
        const selected = useVideoStore.getState().selectedRevision;
        if (!selected || connectionId === null) {
            return;
        }

        const base = current
            ? { ...expectedPosition(current, video.duration), rate: current.rate }
            : { playing: store.getState().isPlaying, time: video.currentTime, rate: useVideoPlayerStore.getState().playbackRate };
        const next: PlayerState = { revisionId: selected.id, ...base, ...change };
        // Held as the session at once, so the next change is compared with it rather than with the state it replaced.
        const held: ReceivedSyncState = { ...next, by: store.getState().screenId, anchor: performance.now() };
        store.getState().setSyncState(held);

        void postSyncState(videoId, next, store.getState().screenId, connectionId).then((sent) => {
            // A send the server did not take leaves the others where they were, so this screen follows them again.
            if (!sent && store.getState().syncState === held) {
                store.getState().setSyncState(current);
            }
        });
    }
}
