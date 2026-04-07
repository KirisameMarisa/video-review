"use client";
import { create } from "zustand";
import { ChatTurn, sendChatSearch } from "@/lib/fetch-wrapper/chat-search";
import { useAuthStore } from "@/stores/auth-store";

interface ChatSearchState {
    isOpen: boolean;
    history: ChatTurn[];
    isLoading: boolean;
    error: string | null;
    open: () => void;
    close: () => void;
    sendMessage: (message: string) => Promise<void>;
    clear: () => void;
}

export const useChatSearchStore = create<ChatSearchState>()((set, get) => ({
    isOpen: false,
    history: [],
    isLoading: false,
    error: null,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    clear: () => set({ history: [], error: null }),

    sendMessage: async (message: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const userTurn: ChatTurn = { role: "user", content: message };
        set((s) => ({ history: [...s.history, userTurn], isLoading: true, error: null }));

        try {
            const { reply } = await sendChatSearch(message, get().history.slice(0, -1), token);
            const assistantTurn: ChatTurn = { role: "assistant", content: reply };
            set((s) => ({ history: [...s.history, assistantTurn], isLoading: false }));
        } catch (err) {
            set({ isLoading: false, error: String(err) });
        }
    },
}));
