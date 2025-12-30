import { Video, VideoRevision } from'@/lib/db-types';

export async function fetchVideos(
    from: Date | undefined,
    to: Date | undefined,
) {
    const params = new URLSearchParams();
    if (from) params.set("from", from.getTime().toString());
    if (to) params.set("to", to.getTime().toString());

    const res = await fetch(`/api/v1/videos?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch videos");
    return await res.json();
}

export async function getVideoList(): Promise<Video[]> {
    const res = await fetch("/api/v1/videos", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Failed to get video list");
    return res.json();
}

export async function getVideoFromId(videoId: string): Promise<Video> {
    const res = await fetch(`/api/v1/videos/${videoId}`);
    if (!res.ok) throw new Error("Failed to fetch video");
    return res.json();
}

export async function getVideoFolderKeys(): Promise<string[]> {
    const res = await fetch(`/api/v1/videos/folders`);
    if (!res.ok) throw new Error("Failed to fetch latest revision");
    return res.json();
}

export async function getVideoRevisionList(
    videoId: string,
): Promise<VideoRevision[]> {
    const res = await fetch(`/api/v1/videos/${videoId}/revisions`);
    if (!res.ok) throw new Error("Failed to fetch all revisions");
    return res.json();
}

export async function fetchLatestRevision(
    videoId: string,
): Promise<VideoRevision> {
    const res = await fetch(`/api/v1/videos/${videoId}/latest`);
    if (!res.ok) throw new Error("Failed to fetch latest revision");
    return res.json();
}
