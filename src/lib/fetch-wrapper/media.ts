import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { ApiError, ApiResult } from "@/lib/utils/api-result";

export async function downloadVideo(videoId: string, videoRevId: string, width?: number): Promise<void> {
    const params = new URLSearchParams();
    params.set("videoId", videoId);
    params.set("videoRevId", videoRevId);
    if (width) params.set("width", width.toString());

    const token = useAuthStore.getState().token;
    const res = await fetch(
        `/api/v1/media/download?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if(res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("unauthorized");
    }

    if (!res.ok) {
        throw new Error("download failed");
    }

    const blob = await res.blob();
    const video = useVideoStore.getState().videos.find(x => x.id === videoId);
    const videoRev = useVideoStore.getState().revisions.find(x => x.id === videoRevId);
    const filename = video?.title +  "_Rev" + videoRev?.revision + (width ? `_${width}p` : "") + ".mp4";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

export async function fetchMediaUrl(filePath: string): Promise<ApiResult<string>> {
    const res = await fetch(`/api/v1/media/resolver/${encodeURI(filePath)}`);
    if(!res.ok) {
       return ApiError(res);
    }

    const json = await res.json();
    return { ok: true, data: json.url };
}