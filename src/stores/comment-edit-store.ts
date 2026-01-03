import { create } from "zustand";
import * as api from "@/lib/fetch-wrapper";
import { VideoComment } from "@/lib/db-types";
import { useCommentStore } from "@/stores/comment-store";

interface CommentEditState {
    editingComment: VideoComment | null;

    editSave: () => Promise<void>;
    editCancel(): void;

    setEditing(comment: VideoComment | null): void;
    setEditDrawingPath(path: string | null): void;
    setEditComment(path: string): void;
    setEditIssueId(path: string | null): void;
}

export const useCommentEditStore = create<CommentEditState>((set, get) => ({
    editingComment: null,

    editSave: async () => {
        const editing = get().editingComment;
        if (!editing) return;

        try {
            const updated = await api.updateComment({
                id: editing.id,
                comment: editing.comment,
                issueId: editing.issueId,
                drawingPath: editing.drawingPath,
            });

            useCommentStore.getState().updateComment(get().editingComment!);

            // 保存後は編集モードを抜ける
            set({ editingComment: null });
        } catch (e) {
            console.error("Failed to save comment:", e);
        }
    },
    editCancel: () => set({ editingComment: null }),

    setEditing: (comment) => set({ editingComment: comment }),
    setEditDrawingPath: (path) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, drawingPath: path },
            };
        }),

    setEditComment: (text) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, comment: text },
            };
        }),

    setEditIssueId: (id) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, issueId: id },
            };
        }),
}));
