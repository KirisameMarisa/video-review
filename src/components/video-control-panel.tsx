"use client";
import React, { useState } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPause,
    faPlay,
    faCirclePlay,
    faRepeat,
    faAnglesRight,
    faLink,
    faDownload,
    faGamepad,
    faVolumeHigh,
    faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/select";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { formatTime } from "@/lib/utils";
import { createVideoTimeLink, OpenScene } from "@/lib/url";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import { ShareLinkDialog } from "@/components/share-link";
import { downloadVideo } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Slider } from "@/ui/slider";
import { Label } from "@radix-ui/react-label";

export default function VideoControlPanel() {
    const t = useTranslations("video-control-panel");
    const { currentTime, duration } = useVideoReviewStore();

    const {
        isPlaying,
        playMode,
        volume,
        volumeEnabled,
        setVolume,
        setVolumeEnabled,
        toggleMode,
        togglePlay,
        playbackRate,
        setPlaybackRate,
    } = useVideoPlayerStore();

    const { selectedVideo, selectedRevision } = useVideoStore();

    const createLink = (): string => {
        if (!selectedVideo) {
            return "";
        }

        if (selectedRevision === null) {
            return "";
        }
        return createVideoTimeLink(selectedVideo?.id, currentTime) ?? "";
    };

    return (
        <div className="flex items-center gap-3 mb-3 bg-[#202020] rounded-lg px-3 py-2 border border-[#333]">
            {/* 再生／停止 */}
            <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-[#d4d4d4] rounded-full w-8 h-8"
            >
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </Button>

            {/* 時間表示 */}
            <span className="text-sm text-[#aaa] w-24">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* 再生速度 */}
            <Select
                value={playbackRate.toString()}
                onValueChange={(val) => {
                    const rate = parseFloat(val);
                    setPlaybackRate(rate);
                }}
            >
                <SelectTrigger className="w-20 h-8 bg-[#181818] text-white border-[#333]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] text-white border-[#333]">
                    {[0.5, 1, 1.5, 2].map((r) => (
                        <SelectItem key={r} value={r.toString()}>
                            {r}x
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* 再生モード */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleMode}
                className="text-white hover:bg-[#d4d4d4] rounded-full w-8 h-8"
            >
                {playMode === "normal" ? (
                    <FontAwesomeIcon icon={faCirclePlay} />
                ) : (
                    <></>
                )}
                {playMode === "loop" ? (
                    <FontAwesomeIcon icon={faRepeat} />
                ) : (
                    <></>
                )}
                {playMode === "next" ? (
                    <FontAwesomeIcon icon={faAnglesRight} />
                ) : (
                    <></>
                )}
            </Button>

            <span className="text-xs text-[#ccc]">
                {t(playMode)}
            </span>

            {/* 音量バー */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    setVolumeEnabled(!volumeEnabled);
                }}
                className="text-white hover:bg-[#d4d4d4] rounded-full w-8 h-8"
            >
                {volumeEnabled  ? (
                    <FontAwesomeIcon icon={faVolumeHigh} />
                ) : (
                    <FontAwesomeIcon icon={faVolumeXmark} />
                )}
            </Button>
            <span className="text-sm text-[#aaa] w-40">
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

            {/* 右端：リンクコピー */}
            <div className="ml-auto    rounded  ">
                <OpenSceneButton scenePath={selectedVideo?.scenePath ?? null} />
                <DownloadVideo videoId={selectedVideo?.id ?? null} videoRevId={selectedRevision?.id ?? null} />
                <ButtonShareLink url={createLink()} />
            </div>
        </div>
    );
}

function ButtonShareLink({ url }: { url: string }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1 bg-[#ff8800] hover:bg-[#ff5500] text-black text-sm font-medium"
            >
                <FontAwesomeIcon icon={faLink} />
            </button>
            <ShareLinkDialog url={url} open={open} onOpenChange={setOpen} />
        </>
    );
}

function DownloadVideo({ videoId, videoRevId }: { videoId: string | null, videoRevId: string | null }) {
    if (!videoId || !videoRevId) {
        return <></>
    }

    return (
        <>
            <button
                onClick={() => downloadVideo(videoId, videoRevId)}
                className="px-3 py-1 bg-[#ff8800] hover:bg-[#ff5500] text-black text-sm font-medium"
            >
                <FontAwesomeIcon icon={faDownload} />
            </button>
        </>
    );
}

function OpenSceneButton({ scenePath }: { scenePath: string | null }) {
    if (!scenePath) {
        return <></>
    }

    return (
        <>
            <button
                onClick={() => OpenScene(scenePath)}
                className="px-3 py-1 bg-[#ff8800] hover:bg-[#ff5500] text-black text-sm font-medium"
            >
                <FontAwesomeIcon icon={faGamepad} />
            </button>
        </>
    );
}
