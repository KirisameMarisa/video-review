import { create } from "zustand";
import * as api from "@/lib/fetch-wrapper";
import { VideoComment, VideoRevision } from "@/lib/db-types";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";

interface CommentState {
    comments: VideoComment[];
    displayComments: VideoComment[];
    loading: boolean;
    lastFetchedAt: number;

    setDisplayComments: (comments: VideoComment[]) => void;
    fetchComments: (videoRevision: VideoRevision) => Promise<void>;
    fetchNewComments: (videoId: string) => Promise<VideoComment[]>;
    addComment: (c: Omit<VideoComment, "notifiedProviders" | "id" | "createdAt" | "updatedAt" | "deleted" | "drawingPath">) => Promise<string>;
    updateComment: (comment: VideoComment) => void;
    deleteComment: (id: string) => Promise<void>;
    incrementThumbsUpCount: (id: string) => Promise<void>;
    issueLinkedComment: (id: string, email: string, issueType: string, screenshot: Blob | null) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
    comments: [],
    displayComments: [],
    loading: false,
    editingComment: null,
    lastFetchedAt: 0,

    setDisplayComments: (comments: VideoComment[]) => {
        set({ displayComments: comments })
    },

    fetchComments: async (videoRevision: VideoRevision) => {
        set({ loading: true });
        const s = useCommentSearchStore.getState();
        const data = await api.fetchComments({
            videoId: videoRevision.videoId,
            selectRevision: videoRevision.revision,
            user: s.user,
            dateRange: useCommentSearchDateFilterStore.getState().resolve(),
            hasDrawing: s.hasDrawing,
            hasIssue: s.hasIssue,
            fetchAllComments: s.fetchAllComments,
            filterText: s.filterText,
        });
        set({ comments: data, loading: false, lastFetchedAt: Date.now() });
    },

    fetchNewComments: async (videoId) => {
        set({ loading: true });
        const data = await api.fetchNewComments(videoId, get().lastFetchedAt);
        set({ comments: [...get().comments, ...data].sort((a, b) => a.time - b.time), loading: false, lastFetchedAt: Date.now() });
        return data;
    },

    addComment: async (c) => {
        const newComment = await api.createComment(c);
        set({ comments: [...get().comments, newComment].sort((a, b) => a.time - b.time) });
        return newComment.id;
    },

    updateComment: async (comment) => {
        set({
            comments: get().comments.map((c) => (c.id === comment.id ? comment : c)),
        });
    },

    issueLinkedComment: async (id, email, issueType, screenshot) => {
        const comment = get().comments.find((c) => c.id === id);
        if (!comment) return;

        const issueId = await api.createJiraIssue(
            id,
            email,
            issueType,
            screenshot
        )
        const updated = await api.updateComment({ id, issueId: issueId });
        set({
            comments: get().comments.map((c) => (c.id === id ? updated : c)),
        });
    },

    deleteComment: async (id) => {
        await api.deleteComment(id);
        set({ comments: get().comments.filter((c) => c.id !== id) });
    },

    incrementThumbsUpCount: async (id) => {
        const updated = await api.incrementThumbsUpCount(id);
        set({
            comments: get().comments.map((c) => (c.id === id ? updated : c)),
        });
    },
}));
