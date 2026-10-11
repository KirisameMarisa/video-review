import { useMemo } from "react";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoListStore } from "@/stores/video-list-store";

// Everything the marks' conditions need beyond the video itself.
export type MarkContext = {
    unreadVideoIds: ReadonlySet<string>;
    // Epoch milliseconds of this browser's first visit on an earlier day.
    previousVisitAt: number | null;
};

// Reads only; the video list panel does the loading.
export function useMarkContext(): MarkContext {
    const unreadVideoIds = useCommentStore((s) => s.unreadVideoIds);
    const previousVisitAt = useVideoListStore((s) => s.previousVisitAt);

    return useMemo(() => ({ unreadVideoIds, previousVisitAt }), [unreadVideoIds, previousVisitAt]);
}
