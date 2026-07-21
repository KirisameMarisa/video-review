"use client"
import VideoReview from "@/components/video-review";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useVideoStore } from "@/stores/video-store";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import * as api from '@/lib/fetch-wrapper'
import { fetchVideoEvents } from "@/lib/fetch-wrapper/events";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export default function VideoReviewPage() {
    const router = useRouter();
    const { videoId } = useParams();
    const searchParams = useSearchParams();

    const {
        verifyAuth,
    } = useAuthStore();

    const {
        selectVideo,
        selectVideoRevision,
        loading,
    } = useVideoStore();

    const { setSelectComment, setTimelineTime } = useVideoReviewStore();

    useEffect(() => {
        void (async () => {
            if (!(await verifyAuth())) {
                router.replace("/video-review/login");
            }
        })();
    }, []);

    useEffect(() => {
        if (!videoId) return;
        void (async () => {
            try {
                const video = await api.getVideoFromId(videoId as string);
                await selectVideo(video);

                const revisionParam = searchParams.get("revision");
                if (revisionParam) {
                    const { revisions } = useVideoStore.getState();
                    const target = revisions.find((r) => r.id === revisionParam);
                    if (target) selectVideoRevision(target);
                }

                const eventContentId = searchParams.get("event");
                if (eventContentId) {
                    const { selectedRevision } = useVideoStore.getState();
                    if (selectedRevision) {
                        const events = await fetchVideoEvents({
                            videoId: selectedRevision.videoId,
                            selectRevision: selectedRevision.revision,
                        });
                        const target = events.find((e) => e.contentId === eventContentId);
                        if (target) setTimelineTime(target.startMs / 1000);
                    }
                }
            } catch (error) {
                console.log("not found videoId", error);
            }
        })();
    }, [videoId, searchParams]);

    useEffect(() => {
        if(loading) return;
        
        const duration = searchParams.get("t");
        const commentId = searchParams.get("comment");
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
    }, [loading]);

    return (
        <div className="flex h-screen">
            <VideoReview />
        </div>
    );
}
