import { create } from "zustand";
import { VideoComment, VideoRevision } from "@prisma/client";

interface VideoReviewState {
    videoRefElement: HTMLVideoElement | null,
    currentTime: number;
    timelineTime: number | null;
    duration: number;
    selectedComment: VideoComment | null;
    activeComments: VideoComment[];

    setSelectComment: (comment: VideoComment | null) => void;
    setVideoRefElement: (video: HTMLVideoElement | null) => void;
    setActiveComments: (comments: VideoComment[]) => void;
    setCurrentTime: (time: number) => void;
    setTimelineTime: (time: number | null) => void;
    setDuration: (duration: number) => void;
}

export const useVideoReviewStore = create<VideoReviewState>((set) => ({
    videoRefElement: null,
    currentTime: 0,
    timelineTime: null,
    duration: 0,
    selectedComment: null,
    activeComments: [],

    setSelectComment: (comment) => set({ selectedComment: comment }),
    setVideoRefElement: (video) => set({ videoRefElement: video }),
    setActiveComments: (comment) => set({ activeComments: comment }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setTimelineTime: (time) => set({ timelineTime: time }),
    setDuration: (duration) => set({ duration }),
}));
