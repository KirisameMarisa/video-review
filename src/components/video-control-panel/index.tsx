"use client";
import React from "react";
import { usePlayback } from "@/stores/playback-store";
import { createVideoTimeLink } from "@/lib/url";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { isGuest } from "@/lib/role";
import { useIsPhone } from "@/lib/hooks/use-is-phone";
import { PlayButton, VolumeControl, TimeDisplay, PlaybackRateSelect, PlaybackResolutionSelect, PlayModeButtons } from "./playback";
import { ScreenshotButton, ShareLinkButton, DownloadButton, OpenSceneButton, FullscreenButton } from "./actions";

export default function VideoControlPanel() {
    const role = useAuthStore((s) => s.role);
    const isPhone = useIsPhone();
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
            {/* A phone has hardware volume and no room for the rest of the row. */}
            {!isPhone && <VolumeControl />}
            <TimeDisplay />
            <PlaybackRateSelect />
            <PlaybackResolutionSelect />
            {!isPhone && <PlayModeButtons />}

            <div className="ml-auto flex gap-1">
                {/* Guests watch only; saving frames or files would take the footage out. */}
                {!isPhone && !isGuest(role) && <ScreenshotButton title={selectedVideo?.title ?? null} time={currentTime} />}
                {!isPhone && <OpenSceneButton scenePath={selectedVideo?.scenePath ?? null} />}
                {!isPhone && !isGuest(role) && <DownloadButton videoId={selectedVideo?.id ?? null} videoRevId={selectedRevision?.id ?? null} />}
                {!isPhone && <ShareLinkButton url={createLink()} />}
                <FullscreenButton />
            </div>
        </div>
    );
}
