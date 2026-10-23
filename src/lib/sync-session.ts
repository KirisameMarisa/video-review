"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { createVideoSyncLink, SYNC_PARAM } from "@/lib/url";

type Router = ReturnType<typeof useRouter>;

export interface PlayerState {
    revisionId: string;
    playing: boolean;
    time: number;
    rate: number;
}

// screenId tags the sender, so its own echo is not followed.
export async function postSyncState(videoId: string, state: PlayerState, screenId: string): Promise<boolean> {
    try {
        const res = await api.videos[":id"].sync.state.$post({ param: { id: videoId }, json: { ...state, by: screenId } });
        return res.ok;
    } catch (e) {
        console.error("Failed to send the sync state", e);
        return false;
    }
}

// Only the video the URL names; the player can move on to the next video without changing the URL.
export function useSyncing(videoId: string | null): boolean {
    const params = useParams();
    const searchParams = useSearchParams();

    return videoId !== null && params.videoId === videoId && searchParams.get(SYNC_PARAM) === "1";
}

function replaceSyncParam(syncing: boolean) {
    const url = new URL(window.location.href);
    if (syncing) {
        url.searchParams.set(SYNC_PARAM, "1");
    } else {
        url.searchParams.delete(SYNC_PARAM);
    }

    // Straight into history: a router navigation would remount the page and reload the video.
    window.history.replaceState(null, "", url);
}

export function joinSync(videoId: string, router: Router) {
    // After autoplay moved on, the URL still names the previous video; go to the shown one instead.
    const link = new URL(createVideoSyncLink(window.location.origin, videoId));
    if (window.location.pathname !== link.pathname) {
        router.replace(`${link.pathname}${link.search}`);
        return;
    }

    replaceSyncParam(true);
}

export function leaveSync() {
    replaceSyncParam(false);
}
