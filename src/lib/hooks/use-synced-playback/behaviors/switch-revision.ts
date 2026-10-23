import { useVideoStore } from "@/stores/video-store";
import {
    isOwn, markApplying, watchSession,
    type SyncBehavior, type SyncContext,
} from "@/lib/hooks/use-synced-playback/behaviors/behavior";

/** Shows the revision the session is on. */
export class SwitchRevision implements SyncBehavior {
    private stopWatching: (() => void) | null = null;

    constructor(private readonly ctx: SyncContext) {}

    attach() {
        this.stopWatching = watchSession(this.ctx, this.onSessionState);
    }

    detach() {
        this.stopWatching?.();
    }

    private onSessionState = () => {
        const state = this.ctx.store.getState().syncState;
        if (!state || isOwn(this.ctx, state)) {
            return;
        }

        const { selectedRevision, revisions, selectVideoRevision } = useVideoStore.getState();
        if (selectedRevision?.id === state.revisionId) {
            return;
        }

        const target = revisions.find((r) => r.id === state.revisionId);
        if (target) {
            markApplying(this.ctx);
            selectVideoRevision(target);
        }
    };
}
