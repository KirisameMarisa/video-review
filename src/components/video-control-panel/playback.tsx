"use client";
import React, { useState } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay, faVolumeHigh, faVolumeXmark } from "@fortawesome/free-solid-svg-icons";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/select";
import { Slider } from "@/ui/slider";
import { ButtonGroup } from "@/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { ArrowRightToLine, ListVideo, Repeat1, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/lib/utils";
import { usePlayback } from "@/stores/playback-store";
import { joinSync, leaveSync, useSyncing } from "@/lib/sync-session";
import { createVideoSyncLink } from "@/lib/url";
import { useRouter } from "next/navigation";
import { ShareLinkDialog } from "@/components/dialog/share-link";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";
import { useConfigStore } from "@/stores/config-store";
import { usePlaybackWidth } from "@/lib/hooks/use-playback-width";

export function PlayButton() {
    const t = useTranslations("video-control-panel");
    const isPlaying = usePlayback((s) => s.isPlaying);
    const togglePlay = usePlayback((s) => s.togglePlay);

    return (
        <Button variant="ghost" size="icon-round" aria-label={isPlaying ? t("pause") : t("play")} onClick={togglePlay}>
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
        </Button>
    );
}

export function VolumeControl() {
    const [showSlider, setShowSlider] = useState(false);
    const volume = useVideoPlayerStore((s) => s.volume);
    const volumeEnabled = useVideoPlayerStore((s) => s.volumeEnabled);
    const setVolume = useVideoPlayerStore((s) => s.setVolume);
    const setVolumeEnabled = useVideoPlayerStore((s) => s.setVolumeEnabled);

    return (
        <div className="ml-2 flex items-center gap-2" onMouseOver={() => setShowSlider(true)} onMouseLeave={() => setShowSlider(false)}>
            <Button variant="ghost" size="icon-round" onClick={() => setVolumeEnabled(!volumeEnabled)}>
                {volumeEnabled ? (
                    <FontAwesomeIcon icon={faVolumeHigh} />
                ) : (
                    <FontAwesomeIcon icon={faVolumeXmark} />
                )}
            </Button>
            <span hidden={!showSlider} className="w-25">
                <Slider
                    min={0}
                    max={1.0}
                    step={0.01}
                    value={[volume]}
                    onValueChange={(v) => {
                        setVolume(v[0]);
                    }}
                    onValueCommit={(v) => {
                        setVolume(v[0]);
                    }}
                    className="w-full"
                />
            </span>
        </div>
    );
}

export function TimeDisplay() {
    const currentTime = usePlayback((s) => s.currentTime);
    const duration = usePlayback((s) => s.duration);

    return (
        <span className="ml-2 flex items-center gap-2 text-sm text-muted-foreground w-30">
            {formatTime(currentTime)} / {formatTime(duration)}
        </span>
    );
}

export function PlaybackRateSelect() {
    const t = useTranslations("video-control-panel");
    const playbackRate = useVideoPlayerStore((s) => s.playbackRate);
    const setPlaybackRate = useVideoPlayerStore((s) => s.setPlaybackRate);

    return (
        <Select
            value={playbackRate.toString()}
            onValueChange={(val) => {
                const rate = parseFloat(val);
                setPlaybackRate(rate);
            }}
        >
            <SelectTrigger size="sm" className="w-20" aria-label={t("playbackRate")} title={t("playbackRate")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                        {r}x
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function PlaybackResolutionSelect() {
    const ORIGINAL = "original";
    const t = useTranslations("video-control-panel");
    const presets = useConfigStore((s) => s.resolutionPresets);
    const width = usePlaybackWidth();
    const setPlaybackWidth = useVideoPlayerStore((s) => s.setPlaybackWidth);

    if (presets.length === 0) {
        return <></>;
    }

    return (
        <Select
            value={width === null ? ORIGINAL : width.toString()}
            onValueChange={(val) => setPlaybackWidth(val === ORIGINAL ? null : parseInt(val))}
        >
            <SelectTrigger size="sm" className="w-24" aria-label={t("playbackResolution")} title={t("playbackResolution")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ORIGINAL}>{t("originalResolution")}</SelectItem>
                {[...presets].sort((a, b) => b - a).map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                        {w}p
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

const PLAY_MODES: { mode: EPlayMode; Icon: LucideIcon }[] = [
    { mode: "normal", Icon: ArrowRightToLine },
    { mode: "loop", Icon: Repeat1 },
    { mode: "next", Icon: ListVideo },
];

export function PlayModeButtons() {
    const t = useTranslations("video-control-panel");
    const playMode = useVideoPlayerStore((s) => s.playMode);
    const setMode = useVideoPlayerStore((s) => s.setMode);

    return (
        <ButtonGroup aria-label={t("playMode")}>
            {PLAY_MODES.map(({ mode, Icon }) => (
                <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                        <Button
                            variant={playMode === mode ? "accent" : "ghost"}
                            size="icon-sm"
                            aria-label={t(mode)}
                            aria-pressed={playMode === mode}
                            onClick={() => setMode(mode)}
                        >
                            <Icon />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t(mode)}</TooltipContent>
                </Tooltip>
            ))}
        </ButtonGroup>
    );
}

export function SyncButton({ videoId }: { videoId: string | null }) {
    const t = useTranslations("video-control-panel");
    const syncing = useSyncing(videoId);
    const participants = usePlayback((s) => s.participants);
    const router = useRouter();
    const syncLink = usePlayback((s) => s.syncLink);
    const setSyncLink = usePlayback((s) => s.setSyncLink);

    if (!videoId) {
        return null;
    }

    const toggle = () => {
        if (syncing) {
            leaveSync();
            return;
        }

        joinSync(videoId, router);
        // The first one in hands out the link; later ones are joining a session that already has it.
        if (participants === 0) {
            setSyncLink(createVideoSyncLink(window.location.origin, videoId));
        }
    };

    const closeLink = (open: boolean) => {
        if (!open) {
            setSyncLink(null);
        }
    };

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={syncing ? "accent" : "ghost"}
                        size="sm"
                        aria-label={t("syncPlayback")}
                        aria-pressed={syncing}
                        onClick={toggle}
                    >
                        <Users />
                        {participants > 0 && participants}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t("syncPlayback")}</TooltipContent>
            </Tooltip>
            <ShareLinkDialog url={syncLink ?? ""} open={syncLink !== null} onOpenChange={closeLink} />
        </>
    );
}
