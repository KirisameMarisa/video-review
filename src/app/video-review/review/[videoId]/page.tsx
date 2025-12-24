"use client"
import VideoReview from "@/components/video-review";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useVideoStore } from "@/stores/video-store";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import * as api from '@/lib/api'
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export default function VideoReviewPage() {
    const router = useRouter();
    const { videoId } = useParams();
    const searchParams = useSearchParams();

    const {
        verifyAuth,
        token
    } = useAuthStore();

    const {
        selectVideo,
        selectVideoRevision,
    } = useVideoStore();

    const { setSelectComment, setTimelineTime } = useVideoReviewStore();

    useEffect(() => {
        if (!token)
            router.replace("/video-review/login");
    }, [token]);

    useEffect(() => {
        (async () => {
            if (!(await verifyAuth())) {
                router.replace("/video-review/login");
            }
        })();
    }, []);

    useEffect(() => {
        const duration = searchParams.get("t");
        const commentId = searchParams.get("comment");
        if (!videoId) return;

        (async () => {
            const video = await api.getVideoFromId(videoId as string);
            const rev = await api.fetchLatestRevision(videoId as string);

            selectVideo(video);
            selectVideoRevision(rev);
            if (duration) {
                setTimelineTime(parseFloat(duration));
            } else if (commentId) {
                setTimeout(async () => {
                    const comment = await api.getComment(commentId as string);
                    setTimelineTime(comment.time);
                    setSelectComment(comment);
                }, 100);
            } else {
                setTimelineTime(null);
                setSelectComment(null);
            }
        })();
    }, [videoId, searchParams]);

    return (
        <div className="flex h-screen">
            <VideoReview />
        </div>
    );
}
