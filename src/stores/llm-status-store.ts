"use client";
import { create } from "zustand";
import { fetchLLMStatus } from "@/lib/fetch-wrapper/llm-status";

interface LLMStatusState {
    available: boolean;
    checked: boolean;
    check: () => Promise<void>;
}

export const useLLMStatusStore = create<LLMStatusState>()((set) => ({
    available: false,
    checked: false,

    check: async () => {
        try {
            const { available } = await fetchLLMStatus();
            set({ available, checked: true });
        } catch {
            set({ available: false, checked: true });
        }
    },
}));
