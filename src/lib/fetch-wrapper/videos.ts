import { Video, VideoRevision } from'@/lib/db-types';
import { DateRange } from 'react-day-picker';
import { ApiError, ApiResult } from "@/lib/utils/api-result";

export async function fetchVideos(data: {
    user?: string,
    videoDateRange?: DateRange,
    commentsDateRange?: DateRange,
    filterIssue?: string,
    filterTree?: string,
    hasIssue?: boolean,
    hasDrawing?: boolean,
    hasComment?: boolean,
    tags?: string[],
}) {
    const params = new URLSearchParams();
    if (data.videoDateRange?.from) params.set("videoFrom", data.videoDateRange?.from.getTime().toString());
    if (data.videoDateRange?.to) params.set("videoTo", data.videoDateRange?.to.getTime().toString());
    if (data.commentsDateRange?.from) params.set("commentsFrom", data.commentsDateRange?.from.getTime().toString());
    if (data.commentsDateRange?.to) params.set("commentsTo", data.commentsDateRange?.to.getTime().toString());
    if (data.user) params.set("user", data.user);
    if (data.filterIssue) params.set("filterIssue", data.filterIssue);
    if (data.filterTree) params.set("filterTree", data.filterTree);
    if (data.hasIssue) params.set("hasIssue", data.hasIssue ? "true" : "false");
    if (data.hasDrawing) params.set("hasDrawing", data.hasDrawing ? "true" : "false");
    if (data.hasComment) params.set("hasComment", data.hasComment ? "true" : "false");
    if (data.tags) params.set("tags", data.tags.join(","));

    const res = await fetch(`/api/v1/videos?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch video");
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

export async function annotateRevision(
    revisionId: string,
    data: { tags?: string[]; summary?: string },
): Promise<ApiResult<VideoRevision>> {
    const res = await fetch(`/api/v1/videos/${revisionId}/metadata/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tags: data.tags?.join(","),
            summary: data.summary,
        }),
    });
    if (res.ok) return { ok: true, data: (await res.json()).videoRevision };
    return ApiError(res);
}

export async function fetchAllVideoTags(): Promise<ApiResult<string[]>> {
    const res = await fetch(`/api/v1/videos/tags`);

    if(res.ok) {
        return { ok: true, data: await res.json() }
    }

    return ApiError(res);
}
