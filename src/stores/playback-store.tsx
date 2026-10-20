"use client"
import { createContext, ReactNode, useContext, useState } from "react";
import { createStore, StoreApi, useStore } from "zustand";

interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    // Set while the seek bar is dragged or a jump is requested; the player seeks to it.
    timelineTime: number | null;
    duration: number;
    // How many connections are in this video's sync session, counted whether or not this screen is in it.
    participants: number;
    // The sync link the dialog shows, null while closed; kept here so it survives joining from another video's URL.
    syncLink: string | null;

    setIsPlaying: (playing: boolean) => void;
    togglePlay: () => void;
    setCurrentTime: (time: number) => void;
    setTimelineTime: (time: number | null) => void;
    setDuration: (duration: number) => void;
    setParticipants: (participants: number) => void;
    setSyncLink: (link: string | null) => void;
}

const createPlaybackStore = () => createStore<PlaybackState>()((set) => ({
    isPlaying: false,
    currentTime: 0,
    timelineTime: null,
    duration: 0,
    participants: 0,
    syncLink: null,

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    setCurrentTime: (time) => set({ currentTime: time }),
    setTimelineTime: (time) => set({ timelineTime: time }),
    setDuration: (duration) => set({ duration }),
    setParticipants: (participants) => set({ participants }),
    setSyncLink: (syncLink) => set({ syncLink }),
}));

const PlaybackStoreContext = createContext<StoreApi<PlaybackState> | null>(null);

// Each screen gets its own playback state, so the review page and the diff-view never
// see each other's position or play state.
export function PlaybackStoreProvider({ children }: { children: ReactNode }) {
    const [store] = useState(createPlaybackStore);

    return <PlaybackStoreContext.Provider value={store}>{children}</PlaybackStoreContext.Provider>;
}

export function usePlaybackStoreApi() {
    const store = useContext(PlaybackStoreContext);
    if (!store) throw new Error("usePlaybackStoreApi must be used inside PlaybackStoreProvider");
    return store;
}

export const usePlayback = <T,>(selector: (s: PlaybackState) => T) => useStore(usePlaybackStoreApi(), selector);
