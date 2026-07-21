import { create } from "zustand";
import { Video, VideoRevision, VideoWithRevision } from "@/lib/db-types";
import { useVideoSearchStore } from "@/stores/video-search-store";
import * as api from '@/lib/fetch-wrapper';

interface VideoState {
    videos: VideoWithRevision[];
    allVideoTags: string[],
    selectedVideo: Video | null;
    revisions: VideoRevision[],
    selectedRevision: VideoRevision | null;
    loading: boolean;

    fetchVideos: () => Promise<void>;
    selectVideo: (video: Video) => Promise<void>;
    nextVideo:() => Promise<boolean>;
    selectVideoRevision: (revision: VideoRevision) => void;
    updateRevisionTags: (revisionId: string, tags: string[]) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    allVideoTags: [],
    selectedVideo: null,
    revisions: [],
    selectedRevision: null,
    loading: false,

    async fetchVideos() {
        set({ loading: true });
        const s = useVideoSearchStore.getState();
        const data = await api.fetchVideos({
            user: s.user,
            videoDateRange: s.videoDateRange,
            commentsDateRange: s.commentsDateRange,
            filterIssue: s.filterIssue,
            filterTree: s.filterTree,
            hasIssue: s.hasIssue,
            hasDrawing: s.hasDrawing,
            hasComment: s.hasComment,
            tags: s.tags
        });
        const tags = await api.fetchAllVideoTags();
        set({ videos: data, loading: false, allVideoTags: tags.ok ? tags.data : [] });
    },

    async selectVideo(video) {
        set({ selectedVideo: video, selectedRevision: null, revisions: [], loading: true });
        const revs = await api.getVideoRevisionList(video.id);
        set({
            revisions: revs,
            selectedRevision: revs[0] ?? null,
            loading: false,
        });
    },

    async nextVideo(){
        const currVideo = get().selectedVideo;
        const videos = get().videos;
        const currIndex = videos.findIndex((v) => v.id === currVideo?.id);

        if(currIndex !== -1 && videos.length > currIndex + 1) {
            const next = videos[currIndex + 1];
            await get().selectVideo(next);
            return true;
        }
        return false;
    },

    selectVideoRevision(revision) {
        set({ selectedRevision: revision });
    },

    async updateRevisionTags(revisionId, tags) {
        const result = await api.annotateRevision(revisionId, { tags });
        if (!result.ok) return;
        set((state) => ({
            selectedRevision:
                state.selectedRevision?.id === revisionId
                    ? { ...state.selectedRevision, tags }
                    : state.selectedRevision,
            revisions: state.revisions.map((r) =>
                r.id === revisionId ? { ...r, tags } : r
            ),
        }));
    },
}));
