"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "@/lib/fetch-wrapper";
import { Role } from "@/lib/role";

interface AuthState {
    displayName: string | null;
    userId: string | null;
    email: string | null;
    role: Role;
    token: string | null;

    verifyAuth: () => Promise<string | null>;
    setAuth: (
        userId: string,
        email: string | null,
        role: Role,
        token: string,
        displayName: string,
    ) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            displayName: null,
            userId: null,
            email: null,
            role: "guest",
            token: null,
            canUseIssueTracker: false,

            verifyAuth: async () => {
                const token = get().token;
                if (!token) return null;

                try {
                    const { id } = await api.authVerify(token);
                    return id;
                } catch {}

                get().logout();
                return null;
            },

            setAuth: (userId, email, role, token, displayName) => {
                set({ userId, email, role, token, displayName });
            },

            logout: () => {
                set({userId: null, token: null});
            },
        }),
        {
            name: "auth-store",
        },
    ),
);
