import { useAuthStore } from "@/stores/auth-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import { ApiError, ApiResult } from "@/lib/utils/api-result";

export async function chat(commentId: string, screenshot: Blob | null)
    : Promise<ApiResult<{ notifiedProviders: string[], toastData: { title: string, comment: string } }>> {
    if (screenshot === null) {
        return { ok: false, msg: "screenshot null", code: "-1" }
    }

    const comment = useCommentStore.getState().comments.find(c => c.id === commentId);
    if (!comment) {
        return { ok: false, msg: "comment not found", code: "-1" }
    }

    const video = useVideoStore.getState().selectedVideo;
    if (!video) {
        return { ok: false, msg: "video not found", code: "-1" }
    }

    const { displayName, email, token } = useAuthStore.getState();
    const form = new FormData();
    form.append("baseURL", window.location.origin);
    form.append("commentId", comment.id);
    form.append("commentText", comment.comment);
    form.append("videoId", comment.videoId);
    form.append("videoTitle", video.title);
    form.append("folderKey", video.folderKey);
    if (video.scenePath) {
        form.append("scenePath", video.scenePath);
    }
    if (displayName) {
        form.append("userName", displayName);
    }
    if (email) {
        form.append("email", email);
    }
    if (screenshot) {
        form.append("screenshot", new File([screenshot], "screenshot.png"));
    }

    const res = await fetch("/api/v1/chat", {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.ok) {
        const data = await res.json();
        return { ok: true, data: { notifiedProviders: data.notifiedProviders, toastData: data.toastData } };

    }

    return ApiError(res);
}
