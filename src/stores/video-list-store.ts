import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VideoListState {
    // Folders open while browsing, kept across reloads.
    openPaths: string[];
    // While filtering every folder starts open; these are the ones closed since the filter changed.
    closedWhileFiltering: string[];

    // When this browser first opened the list on the latest recorded day, from Date.toDateString().
    visitDay: string | null;
    firstVisitAt: number | null;
    // The first visit on an earlier day, so reopening the list during the day doesn't move it.
    // Null until a second day is recorded.
    previousVisitAt: number | null;
    // The admin's organize mode, which shows the list for moving and renaming instead. Not kept
    // across reloads.
    organizing: boolean;

    toggleFolder: (path: string, filtering: boolean) => void;
    // Opens every folder on the way to a video's folder, whichever of them are folded into one row.
    revealFolders: (paths: string[]) => void;
    clearClosedWhileFiltering: () => void;
    recordVisit: (now?: Date) => void;
    setOrganizing: (organizing: boolean) => void;
}

const toggleIn = (paths: string[], path: string) =>
    paths.includes(path) ? paths.filter((p) => p !== path) : [...paths, path];

// How this browser views the sidebar's video list.
export const useVideoListStore = create<VideoListState>()(
    persist(
        (set, get) => ({
            openPaths: [],
            closedWhileFiltering: [],
            visitDay: null,
            firstVisitAt: null,
            previousVisitAt: null,
            organizing: false,

            toggleFolder: (path, filtering) =>
                set((state) => filtering
                    ? { closedWhileFiltering: toggleIn(state.closedWhileFiltering, path) }
                    : { openPaths: toggleIn(state.openPaths, path) }),
            revealFolders: (paths) =>
                set((state) => {
                    const closed = paths.filter((path) => !state.openPaths.includes(path));
                    return closed.length ? { openPaths: [...state.openPaths, ...closed] } : state;
                }),
            clearClosedWhileFiltering: () => set({ closedWhileFiltering: [] }),
            recordVisit: (now = new Date()) => {
                const today = now.toDateString();
                if (get().visitDay === today) {
                    return;
                }
                set((state) => ({ visitDay: today, firstVisitAt: now.getTime(), previousVisitAt: state.firstVisitAt }));
            },
            setOrganizing: (organizing) => set({ organizing }),
        }),
        {
            name: "video-list",
            partialize: ({ openPaths, visitDay, firstVisitAt, previousVisitAt }) =>
                ({ openPaths, visitDay, firstVisitAt, previousVisitAt }),
        },
    ),
);
