import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";

export async function downloadVideo(videoId: string, videoRevId: string): Promise<void> {
    const token = useAuthStore.getState().token;
    const res = await fetch(
        `/api/v1/media/download?videoId=${videoId}&videoRevId=${videoRevId}`,
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
    const filename = video?.title +  "_Rev" + videoRev?.revision + ".mp4";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

export async function fetchMediaUrl(filePath: string): Promise<string> {
    const res = await fetch(`/api/v1/media/resolver/${encodeURI(filePath)}`);
    return (await res.json()).url;
}