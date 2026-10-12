import { create } from "zustand";
import { VideoComment } from "@/lib/db-types";

interface VideoReviewState {
    videoRefElement: HTMLVideoElement | null,
    // The whole player column goes fullscreen, not just the video.
    playerElement: HTMLElement | null;
    fullscreen: boolean;
    selectedComment: VideoComment | null;
    activeComments: VideoComment[];

    setSelectComment: (comment: VideoComment | null) => void;
    setVideoRefElement: (video: HTMLVideoElement | null) => void;
    setPlayerElement: (player: HTMLElement | null) => void;
    // Records what the browser reports; toggleFullscreen is what asks the browser to change it.
    setFullscreen: (active: boolean) => void;
    toggleFullscreen: () => void;
    setActiveComments: (comments: VideoComment[]) => void;
}

export const useVideoReviewStore = create<VideoReviewState>((set, get) => ({
    videoRefElement: null,
    playerElement: null,
    fullscreen: false,
    selectedComment: null,
    activeComments: [],

    setSelectComment: (comment) => set({ selectedComment: comment }),
    setVideoRefElement: (video) => set({ videoRefElement: video }),
    setPlayerElement: (player) => set({ playerElement: player }),
    setFullscreen: (active) => set({ fullscreen: active }),
    toggleFullscreen: () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void get().playerElement?.requestFullscreen();
        }
    },
    setActiveComments: (comment) => set({ activeComments: comment }),
}));
