import { create } from "zustand";
import * as api from "@/lib/fetch-wrapper";
import { VideoRevision, VideoEventWithKind } from "@/lib/db-types";
import { useVideoEventSearchStore } from "@/stores/video-event-search-store";

interface VideoEventState {
    events: VideoEventWithKind[];
    loading: boolean;

    clearEvents: () => void;
    fetchEvents: (videoRevision: VideoRevision) => Promise<void>;
}

export const useVideoEventStore = create<VideoEventState>((set) => ({
    events: [],
    loading: false,

    clearEvents: () => {
        set({ events: [] });
    },

    fetchEvents: async (videoRevision) => {
        set({ loading: true });
        const s = useVideoEventSearchStore.getState();
        const events = await api.fetchVideoEvents({
            videoId: videoRevision.videoId,
            selectRevision: videoRevision.revision,
            filterText: s.filterText,
            kind: s.kind,
            hasLink: s.hasLink,
        });
        set({ events, loading: false });
    },
}));
