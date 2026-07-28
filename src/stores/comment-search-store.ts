import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CommentSearchState {
    hasDrawing: boolean;
    hasIssue: boolean;
    fetchAllComments: boolean;
    user: string | undefined;
    filterText: string;

    setHasDrawing: (x: boolean) => void;
    setHasIssue: (x: boolean) => void;
    setFetchAllComments: (x: boolean) => void;
    setCommentUser: (x: string | undefined) => void;
    setFilterText: (x: string) => void;
    clear: () => void;
    isFiltering: () => boolean;
}

const InitCommentSearchState = {
    hasDrawing: false,
    hasIssue: false,
    fetchAllComments: true,
    user: "",
    filterText: "",
};

export const useCommentSearchStore = create<CommentSearchState>()(
    persist(
        (set, get) => ({
            ...InitCommentSearchState,

            setHasDrawing: (x: boolean) => set({ hasDrawing: x }),
            setHasIssue: (x: boolean) => set({ hasIssue: x }),
            setFetchAllComments: (x: boolean) => set({ fetchAllComments: x }),
            setCommentUser: (x: string | undefined) => set({ user: x }),
            setFilterText: (x: string) => set({ filterText: x }),
            clear: () => set(InitCommentSearchState),
            isFiltering: () => {
                const state = get();

                return Object.keys(InitCommentSearchState).some((key) => {
                    return state[key as keyof typeof InitCommentSearchState]
                        !== InitCommentSearchState[key as keyof typeof InitCommentSearchState];
                });
            },
        }),
        {
            name: "comment-search-store",
        },
    ),
);
