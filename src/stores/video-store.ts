import { create } from "zustand";
import { Video, VideoRevision } from "@/lib/db-types";
import * as api from '@/lib/fetch-wrapper';

interface VideoState {
    videos: Video[];
    selectedVideo: Video | null;
    revisions: VideoRevision[],
    selectedRevision: VideoRevision | null;
    loading: boolean;

    fetchVideos: (from: Date | undefined, to: Date | undefined) => Promise<void>;
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

    async fetchVideos(from: Date | undefined, to: Date | undefined) {
        set({ loading: true });
        const data = await api.fetchVideos(from, to);
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
