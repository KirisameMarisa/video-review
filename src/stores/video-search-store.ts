import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DateRange } from "react-day-picker";
import { normalizePersistedDateRange } from "@/lib/utils/date-helper";

interface VideoSearchState {
    videoDateRange: DateRange | undefined;
    commentsDateRange: DateRange | undefined;
    hasComment: boolean;
    hasDrawing: boolean;
    hasIssue: boolean;
    filterIssue: string;
    user: string | undefined;
    filterTree: string;
    tags: string[];

    setHasComment: (x: boolean) => void;
    setHasDrawing: (x: boolean) => void;
    setHasIssue: (x: boolean) => void;
    setFilterIssue: (x: string) => void;
    setCommentUser: (x: string | undefined) => void;
    setVideoDateRange: (x: DateRange | undefined) => void;
    setCommentsDateRange: (x: DateRange | undefined) => void;
    setFilterTree: (x: string) => void;
    setTags: (x: string[]) => void;
    clear: () => void;
    isFiltering: () => boolean;
}

const InitVideoSearchState = {
    videoDateRange: undefined,
    commentsDateRange: undefined,
    hasComment: false,
    hasDrawing: false,
    hasIssue: false,
    filterIssue: "",
    filterTree: "",
    user: "",
    tags: []
};

export const useVideoSearchStore = create<VideoSearchState>()(
    persist(
        (set, get) => ({
            ...InitVideoSearchState,

            setHasComment: (x: boolean) => set({ hasComment: x }),
            setHasDrawing: (x: boolean) => set({ hasDrawing: x }),
            setHasIssue: (x: boolean) => set({ hasIssue: x }),
            setFilterIssue: (x: string) => set({ filterIssue: x }),
            setCommentUser: (x: string | undefined) => set({ user: x }),
            setVideoDateRange: (x: DateRange | undefined) => set({ videoDateRange: x }),
            setCommentsDateRange: (x: DateRange | undefined) => set({ commentsDateRange: x }),
            setFilterTree: (x: string) => set({ filterTree: x }),
            setTags: (x: string[]) => set({ tags: x }),
            clear: () => set(InitVideoSearchState),
            isFiltering: () => {
                const state = get();

                return Object.keys(InitVideoSearchState).some((key) => {
                    return state[key as keyof typeof InitVideoSearchState]
                        !== InitVideoSearchState[key as keyof typeof InitVideoSearchState];
                });
            }
        }),
        {
            name: "video-search-store",
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                state.videoDateRange = normalizePersistedDateRange(state.videoDateRange);
                state.commentsDateRange = normalizePersistedDateRange(state.commentsDateRange);
            },
        },
    ),
);
