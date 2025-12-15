"use client";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useMemo } from "react";
import { Slider } from "@/ui/slider";

export default function VideoTimelineBar() {
    const { displayComments } = useCommentStore();
    const {
        timelineTime,
        currentTime,
        duration,
        setCurrentTime,
        setTimelineTime,
    } = useVideoReviewStore();

    const commentTimeSet = useMemo(() => {
        const set = new Set<number>();
        for (const c of displayComments) {
            set.add(Number(c.time.toFixed(2)));
        }
        return set;
    }, [displayComments]);

    // valueは配列で受ける
    const value = [timelineTime ?? currentTime];

    return (
        <div className="relative h-6 w-full cursor-pointer select-none">
            {/* 背景バー・再生バー*/}
            <Slider
                min={0}
                max={duration}
                step={0.01}
                value={value}
                onValueChange={(v) => {
                    setTimelineTime(v[0]);
                }}
                onValueCommit={(v) => {
                    setCurrentTime(v[0]);
                    setTimelineTime(null);
                }}
                className="w-full"
            />

            {/* コメントマーカー */}
            {
                [...commentTimeSet.entries()].map(([t]) => (
                    <div
                        key={t}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(t);
                        }}
                        className={`absolute ${Math.abs(currentTime - t) < 0.5 ? "bg-[#ffd37b]" : "bg-[#ff8800]"}`}
                        style={{
                            left: `${(t / duration) * 100}%`,
                            top: "-10px",
                            transform: "translateX(-50%)",
                            width: "5px",
                            height: "25px",
                            borderRadius: "2px",
                            cursor: "pointer",
                        }}
                    />
                ))}
        </div>
    );
}