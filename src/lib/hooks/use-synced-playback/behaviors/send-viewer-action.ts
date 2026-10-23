import { postSyncState, type PlayerState } from "@/lib/sync-session";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import {
    isViewerAction, matchesSession, othersPlaying,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Sends this viewer's play, pause, seek and speed changes to the session. */
export class SendViewerAction implements SyncBehavior {
    private static readonly EVENTS = ["play", "pause", "seeked"];

    private stopWatchingRate: (() => void) | null = null;
    // One request at a time; a seek drag sends only its latest position.
    private inFlight = false;
    private queued: PlayerState | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        for (const name of SendViewerAction.EVENTS) {
            this.ctx.video.addEventListener(name, this.onPlayerEvent);
        }

        // The speed menu writes the store; the element's ratechange also fires for nudges.
        this.stopWatchingRate = useVideoPlayerStore.subscribe((s, prev) => {
            if (s.playbackRate !== prev.playbackRate) {
                this.sendIfViewerAction("ratechange");
            }
        });
    }

    detach() {
        this.queued = null;
        this.stopWatchingRate?.();

        for (const name of SendViewerAction.EVENTS) {
            this.ctx.video.removeEventListener(name, this.onPlayerEvent);
        }
    }

    private onPlayerEvent = (e: Event) => {
        this.sendIfViewerAction(e.type);
    };

    private sendIfViewerAction(type: string) {
        const ctx = this.ctx;
        const { video, store } = ctx;
        if (type === "seeked" && ctx.followingSeek) {
            ctx.followingSeek = false;
            return;
        }
        if (!isViewerAction(ctx)) {
            return;
        }

        const player = this.readPlayerState();
        if (!player) {
            return;
        }

        // Play while the session plays catches this screen up instead of being sent.
        if (type === "play" && othersPlaying(ctx)) {
            return;
        }

        const state = store.getState().syncState;
        if (state && matchesSession(player, state, video.duration)) {
            return;
        }
        void this.postPlayerState(player);
    }

    private readPlayerState(): PlayerState | null {
        const selected = useVideoStore.getState().selectedRevision;
        if (!selected) {
            return null;
        }
        // The store's rate: the element may be running nudged.
        const rate = useVideoPlayerStore.getState().playbackRate;
        return { revisionId: selected.id, playing: !this.ctx.video.paused, time: this.ctx.video.currentTime, rate };
    }

    private async postPlayerState(player: PlayerState) {
        if (this.inFlight) {
            this.queued = player;
            return;
        }

        this.inFlight = true;
        await postSyncState(this.ctx.videoId, player, this.ctx.store.getState().screenId);
        this.inFlight = false;

        const next = this.queued;
        this.queued = null;
        // detach clears the queue, so nothing is sent after the session ends.
        if (next) {
            void this.postPlayerState(next);
        }
    }
}
