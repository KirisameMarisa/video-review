"use client";
import React from "react";
import { usePlayback } from "@/stores/playback-store";
import { createVideoTimeLink } from "@/lib/url";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { isGuest } from "@/lib/role";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { PlayButton, VolumeControl, TimeDisplay, PlaybackRateSelect, PlaybackResolutionSelect, PlayModeButtons, SyncButton } from "./playback";
import { ScreenshotButton, ShareLinkButton, DownloadButton, OpenSceneButton, FullscreenButton } from "./actions";

export default function VideoControlPanel() {
    const role = useAuthStore((s) => s.role);
    const isMobile = useIsMobile();
    const currentTime = usePlayback((s) => s.currentTime);
    const { selectedVideo, selectedRevision } = useVideoStore();

    const createLink = (): string => {
        if (!selectedVideo) {
            return "";
        }

        if (selectedRevision === null) {
            return "";
        }
        return createVideoTimeLink(window.location.origin, selectedVideo?.id, currentTime) ?? "";
    };

    return (
        <div className="flex items-center gap-3 mb-3 bg-card rounded-lg px-3 py-2 border">
            <PlayButton />
            {/* The mobile row has no room for the rest, and a phone has hardware volume. */}
            {!isMobile && <VolumeControl />}
            <TimeDisplay />
            <PlaybackRateSelect />
            <PlaybackResolutionSelect />
            {!isMobile && <PlayModeButtons videoId={selectedVideo?.id ?? null} />}
            <SyncButton videoId={selectedVideo?.id ?? null} />

            <div className="ml-auto flex gap-1">
                {/* Guests watch only; saving frames or files would take the footage out. */}
                {!isMobile && !isGuest(role) && <ScreenshotButton title={selectedVideo?.title ?? null} time={currentTime} />}
                {!isMobile && <OpenSceneButton scenePath={selectedVideo?.scenePath ?? null} />}
                {!isMobile && !isGuest(role) && <DownloadButton videoId={selectedVideo?.id ?? null} videoRevId={selectedRevision?.id ?? null} />}
                {!isMobile && <ShareLinkButton url={createLink()} />}
                <FullscreenButton />
            </div>
        </div>
    );
}
