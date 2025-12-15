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
import { VideoComment } from "@prisma/client";
import { useDrawingStore } from "@/stores/drawing-store";
import { useTranslations } from "next-intl";
import { findFirstWithinEps } from "@/lib/utils";
import { set } from "date-fns";

export default function VideoReview() {
    const t = useTranslations("video-review");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const {
        setCanvasRefElement,
        canvasEditing } = useDrawingStore();

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
        playModeRef.current = playMode;
    }, [playMode])

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const toDraw = isPlaying ? activeComments : (selectedComment ? [selectedComment] : []);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const comment of toDraw) {
            if (!comment.drawingPath) continue;
            const img = new Image();
            img.src = `${comment.drawingPath}`;
            img.onload = () => {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            };
        }
    }, [activeComments, selectedComment]);

    useEffect(() => {
        if (selectedComment && selectedComment.time !== currentTime) {
            setSelectComment(null);
        }

        const now = currentTime;
        const eps = 0.3;
        const activeIndex = findFirstWithinEps(commentTimeList, currentTime, eps);
        if(activeIndex !== null) {
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
                                    src={selectedRevision.filePath}
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