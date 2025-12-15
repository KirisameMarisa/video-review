"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "@/lib/api";

interface AuthState {
    canUseIssueTracker: boolean;
    displayName: string | null;
    userId: string | null;
    email: string | null;
    token: string | null;

    verifyAuth: () => Promise<boolean>;
    setAuth: (
        userId: string,
        email: string,
        token: string,
        displayName: string,
        canUseIssueTracker: boolean,
    ) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            displayName: null,
            userId: null,
            email: null,
            token: null,
            canUseIssueTracker: false,

            verifyAuth: async () => {
                const token = get().token;
                if (!token) return false;

                try {
                    return await api.authVerify(token);
                } catch {}

                get().logout();
                return false;
            },

            setAuth: (userId, email, token, displayName, noIssueTrackerAccount) => {
                set({ userId, email, token, displayName, canUseIssueTracker: !noIssueTrackerAccount });
            },

            logout: () => {
                set({
                    userId: null,
                    token: null,
                });
            },
        }),
        {
            name: "auth-store",
        },
    ),
);
