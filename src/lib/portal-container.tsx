"use client";
import { createContext, useContext } from "react";

// Where the portal-based primitives render. The browser shows only the fullscreen element's
// subtree, so a player in fullscreen points this at itself; null means body.
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
    return useContext(PortalContainerContext) ?? undefined;
}
