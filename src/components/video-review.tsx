"use client"
import React, { useRef, useEffect, useState, useMemo } from "react";
import { useVideoReviewStore } from "@/stores/video-review-store";
import VideoTimelineBar from "@/components/video-timeline-bar";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";
import VideoControlPanel from "@/components/video-control-panel";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import VideoTitle from "@/components/video-title";
import CanvasControlPanel from "@/components/canvas-control-panel";
import { VideoComment } from "@/lib/db-types";
import { useDrawingStore } from "@/stores/drawing-store";
import { useTranslations } from "next-intl";
import { fetchMediaUrl } from "@/lib/fetch-wrapper";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function VideoReview() {
    const t = useTranslations("video-review");
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const commentDrawingCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

    const {
        setCanvasRefElement,
        canvasEditing } = useDrawingStore();

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
        activeComments,
        setVideoRefElement,
        selectedComment,
        currentTime,
        timelineTime,
        setSelectComment,
        setActiveComments,
        setTimelineTime,
        setCurrentTime,
        setDuration } = useVideoReviewStore();

    const {
        playMode,
        isPlaying,
        togglePlay,
        volume,
        volumeEnabled,
        setIsPlaying,
        playbackRate,
    } = useVideoPlayerStore();

    const playModeRef = useRef<EPlayMode>(playMode);
    const timelineTimeRef = useRef<number>(timelineTime);

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

        if (timelineTimeRef.current !== null) {
            setCurrentTime(timelineTimeRef.current);
            v.currentTime = timelineTimeRef.current;
        }
    }

    useEffect(() => {
        if (!token)
            router.replace("/video-review/login");
    }, [token]);

    useEffect(() => {
        playModeRef.current = playMode;
    }, [playMode]);

    useEffect(() => {
        let canceled = false;
        (async () => {
            for (const c of comments) {
                const path = c.drawingPath;
                if (!path) continue;

                if (commentDrawingCache.current.has(path)) continue;
                const url = await fetchMediaUrl(path);
                if (canceled) return;


                const img = new Image();
                img.src = url;

                img.onload = () => {
                    if (canceled) return;
                    commentDrawingCache.current.set(path, img);
                };
                commentDrawingCache.current.set(path, img);
            }
        })();
    }, [comments]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const toDraw = isPlaying ? activeComments : (selectedComment ? [selectedComment] : []);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const comment of toDraw) {
            if (!comment.drawingPath) continue;

            const img = commentDrawingCache.current.get(comment.drawingPath);
            if(!img || !img.complete || img.width === 0 || img.height === 0) continue;

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }, [activeComments, selectedComment, isPlaying]);

    useEffect(() => {
        if (selectedComment && selectedComment.time !== currentTime) {
            setSelectComment(null);
        }

        const now = currentTime;
        const eps = 0.3;
        const activeIndex = findFirstWithinEps(commentTimeList, currentTime, eps);
        if (activeIndex !== null) {
            console.log("ActiveIndex:", activeIndex, currentTime);
            const active = commentTimeBasedMap.get(commentTimeList[activeIndex]) ?? [];
            setActiveComments(active);
        } else {
            setActiveComments([]);
        }
    }, [currentTime])

    useEffect(() => {
        setCanvasRefElement(canvasRef.current);
    }, [canvasRef.current]);

    useEffect(() => {
        setVideoRefElement(videoRef.current);
    }, [videoRef.current]);

    useEffect(() => {
        setCurrentTime(0);
    }, [selectedVideo])

    useEffect(() => {
        if (selectedRevision == null) return

        const v = videoRef.current;
        const c = canvasRef.current;
        if (!c || !v) return;

        fetchComments(selectedRevision?.videoId);

        let canceled = false;
        (async () => {
            const url = await fetchMediaUrl(
                selectedRevision.filePath
            );
            if (url && !canceled) {
                setPlaybackUrl(url);
            }
        })();

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onMeta = () => {
            setDuration(v.duration);
            const rect = v.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            c.width = rect.width * ratio;
            c.height = rect.height * ratio;

            const ctx = c.getContext("2d");
            if (ctx) {
                ctx.scale(ratio, ratio);
            }

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
            console.log(playMode, playModeRef.current)
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
        if(volumeEnabled) {
            v.volume = volume;
        } else {
            v.volume = 0.0;
        }
    }, [volume, volumeEnabled]);

    useEffect(() => {
        timelineTimeRef.current = timelineTime;
        applyTimelineTime();
    }, [timelineTime]);

    return (
        <>
            {/* 中央 */}
            <div className={`flex flex-col h-full w-full border-r border-[#333]`}>
                {selectedRevision ? (
                    <>
                        <VideoTitle />
                        <div className="flex-1 flex flex-col items-center justify-center bg-black rounded mb-3 relative">
                            <div className="relative inline-block">
                                <video
                                    ref={videoRef}
                                    src={playbackUrl ?? undefined}
                                    onClick={togglePlay}
                                    className="max-h-[80vh] max-w-full rounded cursor-pointer object-contain"
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 w-full h-full"
                                    style={{
                                        pointerEvents: canvasEditing ? "auto" : "none",
                                        cursor: canvasEditing ? "crosshair" : "default",
                                    }}
                                />
                                <CanvasControlPanel />
                            </div>
                        </div>

                        <VideoTimelineBar />
                        <VideoControlPanel />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[#555]">
                        {t("noVideoSelected")}
                    </div>
                )}
            </div>
        </>
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