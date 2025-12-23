import { create } from "zustand";

export type EPlayMode = 'normal' | 'loop' | 'next';

interface VideoPlayerState {
    isPlaying: boolean;
    volume: number
    volumeEnabled: boolean;
    playMode: EPlayMode,
    playbackRate: number;

    setIsPlaying: (r: boolean) => void;
    setPlaybackRate: (rate: number) => void;
    setVolume: (vol: number) => void;
    setVolumeEnabled: (enabled: boolean) => void;
    toggleMode: () => void;
    togglePlay: () => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>((set, get) => ({
    isPlaying: false,
    volume: 0.3,
    volumeEnabled: true,
    playMode: 'normal',
    playbackRate: 1.0,

    setIsPlaying: (r) => set({ isPlaying: r }),
    setPlaybackRate: (rate) => set({ playbackRate: rate }),
    toggleMode: () => {
        const currMode = get().playMode;
        switch(currMode) {
            case "normal": set({playMode: "loop"});   break;
            case "loop":   set({playMode: "next"});   break;
            case "next":   set({playMode: "normal"}); break;
        }
    },
    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    setVolume: (vol) => set({ volume: vol }),
    setVolumeEnabled: (enabled) => set({ volumeEnabled: enabled }),
}));
