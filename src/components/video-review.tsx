"use client"
import { useRef, useEffect, useState, useMemo, useCallback, type CSSProperties, type MouseEvent } from "react";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { usePlayback } from "@/stores/playback-store";
import VideoTimelineBar from "@/components/video-timeline-bar";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";
import VideoControlPanel from "@/components/video-control-panel";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import VideoTitle from "@/components/video-title";
import { VideoComment } from "@/lib/db-types";
import { DrawingLayer } from "@/components/drawing-layer";
import { useTranslations } from "next-intl";
import { resolveMediaUrl } from "@/lib/media-url";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { LoadingBadge } from "@/components/controls/loading-badge";
import { useFullscreenSync } from "@/lib/hooks/use-fullscreen-sync";
import { PortalContainerContext } from "@/lib/portal-container";
import { Toaster } from "@/components/ui/sonner";

// Well under one frame at any frame rate, so only the time a paused video already shows
// counts as the same.
const SAME_TIME_S = 0.001;

export default function VideoReview() {
    const t = useTranslations("video-review");
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    // Feeds video-fit; 16/9 until loadedmetadata.
    const [videoAspect, setVideoAspect] = useState("16 / 9");

    const { token } = useAuthStore();

    const {
        videos,
        nextVideo,
        selectedVideo,
        selectedRevision,
        loading,
    } = useVideoStore();

    const { comments, fetchComments } = useCommentStore();
    const {
        setVideoRefElement,
        setPlayerElement,
        playerElement,
        fullscreen,
        selectedComment,
        setSelectComment,
        setActiveComments } = useVideoReviewStore();

    useFullscreenSync();

    const {
        isPlaying,
        currentTime,
        timelineTime,
        togglePlay,
        setIsPlaying,
        setTimelineTime,
        setCurrentTime,
        setDuration } = usePlayback((s) => s);

    const {
        playMode,
        volume,
        volumeEnabled,
        playbackRate,
    } = useVideoPlayerStore();

    const playModeRef = useRef<EPlayMode>(playMode);
    const timelineTimeRef = useRef<number>(timelineTime);

    // A callback ref keeps the store's element current across remounts of the player.
    const attachVideo = useCallback((el: HTMLVideoElement | null) => {
        videoRef.current = el;
        setVideoRefElement(el);
    }, []);

    const { commentTimeBasedMap, commentTimeList } = useMemo(() => {
        const m = new Map<number, VideoComment[]>();
        const times: number[] = [];

        for (const c of comments) {
            const t = Number(c.time.toFixed(2));
            if (!m.has(t)) {
                m.set(t, []);
                times.push(t);
            }
            m.get(t)!.push(c);
        }

        times.sort((a, b) => a - b);
        return { commentTimeBasedMap: m, commentTimeList: times };
    }, [comments]);

    const applyTimelineTime = () => {
        const v = videoRef.current;
        if (!v) return;

        const target = timelineTimeRef.current;
        if (target === null) {
            return;
        }

        setCurrentTime(target);
        // Seeking to where a paused video already is can show the neighbouring frame, so selecting
        // a comment written there would nudge the picture.
        if (v.paused && Math.abs(v.currentTime - target) < SAME_TIME_S) {
            return;
        }
        v.currentTime = target;
    }

    // Black bars beside the picture play and pause like the picture; canvas clicks are strokes.
    const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget || e.target === videoRef.current) {
            togglePlay();
        }
    };

    useEffect(() => {
        if (!token)
            router.replace("/video-review/login");
    }, [token]);

    useEffect(() => {
        playModeRef.current = playMode;
    }, [playMode]);

    useEffect(() => {
        if (selectedComment && selectedComment.time !== currentTime) {
            setSelectComment(null);
        }

        const now = currentTime;
        const eps = 0.3;
        const activeIndex = findFirstWithinEps(commentTimeList, currentTime, eps);
        if (activeIndex !== null) {
            const active = commentTimeBasedMap.get(commentTimeList[activeIndex]) ?? [];
            setActiveComments(active);
        } else {
            setActiveComments([]);
        }
    }, [currentTime])

    useEffect(() => {
        setCurrentTime(0);
    }, [selectedVideo])

    useEffect(() => {
        if (selectedRevision == null) return

        const v = videoRef.current;
        if (!v) return;

        fetchComments(selectedRevision);

        let canceled = false;
        void (async () => {
            const url = await resolveMediaUrl(selectedRevision.filePath);
            if (url && !canceled) {
                setPlaybackUrl(url);
            }
        })();

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onMeta = () => {
            setDuration(v.duration);
            setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
            v.playbackRate = playbackRate;
            v.volume = volumeEnabled ? volume : 0.0;
        }
        const onTimeUpdate = () => {
            if (timelineTimeRef.current !== null) {
                return;
            }
            setCurrentTime(v.currentTime);
        };
        const onEnded = () => {
            switch (playModeRef.current) {
                case "normal": break;
                case "loop": {
                    setIsPlaying(true);
                }
                    break;
                case "next": {
                    nextVideo().then((ret) => {
                        if (!ret) return;

                        setTimeout(() => {
                            setIsPlaying(true);
                        }, 300);
                    });
                }
                    break;
            }
        }

        v.addEventListener("loadedmetadata", onMeta);
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
        v.addEventListener("timeupdate", onTimeUpdate);
        v.addEventListener("ended", onEnded);

        return () => {
            canceled = true;
            v.removeEventListener("play", onPlay);
            v.removeEventListener("pause", onPause);
            v.removeEventListener("loadedmetadata", onMeta);
            v.removeEventListener("timeupdate", onTimeUpdate);
            v.removeEventListener("ended", onEnded);
        };
    }, [selectedRevision]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }

        if (isPlaying) {
            v.play();
        } else {
            v.pause();
        }
        setTimelineTime(null);
    }, [isPlaying]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }
        v.playbackRate = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }
        if (volumeEnabled) {
            v.volume = volume;
        } else {
            v.volume = 0.0;
        }
    }, [volume, volumeEnabled]);

    useEffect(() => {
        timelineTimeRef.current = timelineTime;
        applyTimelineTime();
    }, [selectedRevision, timelineTime]);

    return (
        // Dropdowns and dialogs opened from the player must render inside it while it is fullscreen.
        <PortalContainerContext.Provider value={fullscreen ? playerElement : null}>
            <div ref={setPlayerElement} className="relative flex flex-col h-full w-full border-r">
                {loading
                    ?
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <LoadingBadge>Videos Syncing...</LoadingBadge>
                    </div>
                    :
                    <>
                        <VideoTitle />
                        {selectedRevision ? (
                            <>
                                <div data-slot="video-stage" onClick={onStageClick} className="video-stage flex-1 min-h-0 flex items-center justify-center bg-black rounded mb-3 relative cursor-pointer phone-fullscreen:rounded-none phone-fullscreen:mb-0">
                                    <div className="video-fit relative" style={{ "--video-aspect": videoAspect } as CSSProperties}>
                                        <video
                                            ref={attachVideo}
                                            src={playbackUrl ?? undefined}
                                            className="w-full h-full rounded"
                                        />
                                        <DrawingLayer />
                                    </div>
                                </div>

                                {/* In phone fullscreen these overlay the picture so the video can fill the screen. */}
                                <div className="phone-fullscreen:absolute phone-fullscreen:inset-x-0 phone-fullscreen:bottom-0 phone-fullscreen:px-2">
                                    <VideoTimelineBar />
                                    <VideoControlPanel />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                {t("noVideoSelected")}
                            </div>
                        )}
                    </>
                }
                {/* The app's toaster sits in body, which the browser hides while the player is fullscreen.
                    Lifted above the timeline and the control bar so it covers no buttons. */}
                {fullscreen && <Toaster offset={{ bottom: "6.5rem" }} />}
            </div>
        </PortalContainerContext.Provider>
    );
}

function findFirstWithinEps(arr: number[], target: number, eps: number): number | null {
    let lo = 0, hi = arr.length - 1;

    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= target) lo = mid + 1;
        else hi = mid - 1;
    }

    const candidates = [hi, hi + 1];
    for (const i of candidates) {
        if (i >= 0 && i < arr.length) {
            if (Math.abs(arr[i] - target) <= eps) return i;
        }
    }

    return null;
}