"use client"
import VideoReview from "@/components/video-review";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function VideoReviewPage() {
    const router = useRouter();

    const {
        verifyAuth,
    } = useAuthStore();

    useEffect(() => {
        (async () => {
            if (!(await verifyAuth())) {
            router.replace("/video-review/login");
        }
        })();
    }, []);

    return (
        <div className="flex h-screen">
            <VideoReview />
        </div>
    );
}
