import { create } from "zustand";
import { api } from "@/lib/api-client";
import { VideoComment } from "@/lib/db-types";
import { useCommentStore } from "@/stores/comment-store";

interface CommentEditState {
    editingComment: VideoComment | null;

    editSave: () => Promise<void>;
    editCancel(): void;

    setEditing(comment: VideoComment | null): void;
    /** Takes the drawing fields from the comment as the server returned it after a drawing save. */
    setEditDrawing(saved: VideoComment): void;
    setEditComment(path: string): void;
    setEditIssueId(path: string | null): void;
}

export const useCommentEditStore = create<CommentEditState>((set, get) => ({
    editingComment: null,

    editSave: async () => {
        const editing = get().editingComment;
        if (!editing) return;

        try {
            const res = await api.comments.index.$patch({
                json: {
                    id: editing.id,
                    comment: editing.comment,
                    issueId: editing.issueId,
                },
            });
            if (res.status !== 200) throw new Error("Failed to update comment");

            useCommentStore.getState().updateComment(get().editingComment!);
            set({ editingComment: null });
        } catch (e) {
            console.error("Failed to save comment:", e);
        }
    },
    editCancel: () => set({ editingComment: null }),

    setEditing: (comment) => set({ editingComment: comment }),
    setEditDrawing: (saved) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, drawingPath: saved.drawingPath, hasDrawing: saved.hasDrawing, updatedAt: saved.updatedAt },
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
