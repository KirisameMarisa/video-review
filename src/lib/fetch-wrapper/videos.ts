import { Video, VideoRevision } from'@/lib/db-types';
import { DateRange } from 'react-day-picker';

export async function fetchVideos(data: {
    user?: string,
    dateRange?: DateRange,
    filterIssue?: string,
    filterTree?: string,
    hasIssue?: boolean,
    hasDrawing?: boolean,
    hasComment?: boolean,
}) {
    const params = new URLSearchParams();
    if (data.dateRange?.from) params.set("from", data.dateRange?.from.getTime().toString());
    if (data.dateRange?.to) params.set("to", data.dateRange?.to.getTime().toString());
    if (data.user) params.set("user", data.user);
    if (data.filterIssue) params.set("filterIssue", data.filterIssue);
    if (data.filterTree) params.set("filterTree", data.filterTree);
    if (data.hasIssue) params.set("hasIssue", data.hasIssue ? "true" : "false");
    if (data.hasDrawing) params.set("hasDrawing", data.hasDrawing ? "true" : "false");
    if (data.hasComment) params.set("hasComment", data.hasComment ? "true" : "false");

    const res = await fetch(`/api/v1/videos?${params.toString()}`);
    if (!res.ok) [];
    return await res.json();
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
