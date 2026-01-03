import { create } from "zustand";
import { Video, VideoRevision } from "@/lib/db-types";
import { useVideoSearchStore } from "@/stores/video-search-store";
import * as api from '@/lib/fetch-wrapper';

interface VideoState {
    videos: Video[];
    selectedVideo: Video | null;
    revisions: VideoRevision[],
    selectedRevision: VideoRevision | null;
    loading: boolean;

    fetchVideos: () => Promise<void>;
    selectVideo: (video: Video) => Promise<void>;
    nextVideo:() => Promise<boolean>;
    selectVideoRevision: (revision: VideoRevision) => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    selectedVideo: null,
    revisions: [],
    selectedRevision: null,
    loading: false,

    async fetchVideos() {
        set({ loading: true });
        const s = useVideoSearchStore.getState();
        const data = await api.fetchVideos({
            user: s.user,
            dateRange: s.dateRange,
            filterIssue: s.filterIssue,
            filterTree: s.filterTree,
            hasIssue: s.hasIssue,
            hasDrawing: s.hasDrawing,
            hasComment: s.hasComment,
        });
        set({ videos: data, loading: false });
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
}));
