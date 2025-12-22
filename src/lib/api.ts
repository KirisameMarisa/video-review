import { useAuthStore } from "@/stores/auth-store";
import { Video, VideoRevision, VideoComment } from "@prisma/client";
import { Role } from "@/lib/role";
import { use } from "react";

export async function fetchVideos(
    from: Date | undefined,
    to: Date | undefined,
) {
    const params = new URLSearchParams();
    if (from) params.set("from", from.getTime().toString());
    if (to) params.set("to", to.getTime().toString());

    const res = await fetch(`/api/videos?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch videos");
    return await res.json();
}

export async function fetchComments(videoId: string): Promise<VideoComment[]> {
    const res = await fetch(`/api/comments?videoId=${videoId}`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
}

export async function fetchNewComments(videoId: string, lastFetchedAt: number) {
    const res = await fetch(
        `/api/comments?videoId=${videoId}&since=${new Date(
            lastFetchedAt,
        ).toISOString()}`,
    );
    if (!res.ok) throw new Error("Failed to fetch new comments");
    return await res.json();
}

export async function createComment(data: {
    videoId: string;
    videoRevNum: number;
    userName: string;
    userEmail: string;
    comment: string;
    time: number;
}) {
    const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create comment");
    return res.json();
}

export async function updateComment(data: {
    id: string;
    comment?: string;
    issueId?: string;
    drawingPath?: string;
    thumbsUp?: boolean;
}) {
    const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update comment");
    return res.json();
}

export async function incrementThumbsUpCount(id: string) {
    const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id,
            thumbsUp: true,
        }),
    });
    if (!res.ok) throw new Error("Failed to update comment");
    return res.json();
}

export async function deleteComment(id: string) {
    const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id,
            deleted: true,
        }),
    });
    if (!res.ok) throw new Error("Failed to update comment");
    return res.json();
}

export async function getComment(commentId: string): Promise<VideoComment> {
    const res = await fetch(`/api/comments/${commentId}`);
    if (!res.ok) throw new Error("Failed to comment");
    return res.json();
}

export async function createJiraIssue(
    reporterEmail: string,
    issueType: string,
    summary: string,
    description: string,
    screenshot: Blob | null,
) {
    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("summary", summary);
    form.append("description", description);
    form.append("issueType", issueType);
    form.append("reporterEmail", reporterEmail);
    if (screenshot) {
        form.append("file", new File([screenshot], "screenshot.png"));
    }

    const res = await fetch("/api/jira/create", {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if(res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("unauthorized");
    }

    if (!res.ok) throw new Error("Failed to update comment");

    const json = await res.json();
    return json.issueKey;
}

export async function postSlack(comment: string, screenshot: Blob | null) {
    const token = useAuthStore.getState().token;

    if (screenshot === null) {
        throw new Error("Failed to post slack, not found screenshot");
    }

    const form = new FormData();
    form.append("comment", comment);
    form.append("file", new File([screenshot], "screenshot.png"));
    const res = await fetch("/api/slack/post", {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if(res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("unauthorized");
    }

    if (!res.ok) throw new Error("Failed to update slack");

    const json = await res.json();
    return json.success;
}

export async function getVideoList(): Promise<Video[]> {
    const res = await fetch("/api/videos", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error("Failed to get video list");
    return res.json();
}

export async function getVideoFromId(videoId: string): Promise<Video> {
    const res = await fetch(`/api/videos/${videoId}`);
    if (!res.ok) throw new Error("Failed to fetch video");
    return res.json();
}

export async function getVideoFolderKeys(): Promise<string[]> {
    const res = await fetch(`/api/videos/folders`);
    if (!res.ok) throw new Error("Failed to fetch latest revision");
    return res.json();
}

export async function getVideoRevisionList(
    videoId: string,
): Promise<VideoRevision[]> {
    const res = await fetch(`/api/videos/${videoId}/revisions`);
    if (!res.ok) throw new Error("Failed to fetch all revisions");
    return res.json();
}

export async function fetchLatestRevision(
    videoId: string,
): Promise<VideoRevision> {
    const res = await fetch(`/api/videos/${videoId}/latest`);
    if (!res.ok) throw new Error("Failed to fetch latest revision");
    return res.json();
}

export async function fetchLastUpdated(videoId: string): Promise<number> {
    const email = useAuthStore.getState().email;
    const res = await fetch(
        `/api/comments/last-updated?videoId=${videoId}&email=${email}`,
    );
    if (!res.ok) throw new Error("Failed to fetch comments");
    const json = await res.json();
    return new Date(json.updatedAt).getTime();
}

export async function fetchLatestCommentId(
    videoId: string,
): Promise<string | null> {
    const res = await fetch(`/api/read-status/latest?videoId=${videoId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to usert read comment");
    const json = await res.json();
    return json.latestCommentId;
}

export async function readVideoComment(userId: string, videoId: string) {
    const lastReadCommentId = await fetchLatestCommentId(videoId);
    if (!lastReadCommentId) {
        return;
    }

    const res = await fetch("/api/read-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId,
            videoId,
            lastReadCommentId,
        }),
    });
    if (!res.ok) throw new Error("Failed to usert read comment");
}

export async function hasUnreadVideoComment(userId: string): Promise<string[]> {
    const res = await fetch(`/api/read-status/unread?userId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("failed to get unread comment info");
    const json = await res.json();
    return json.unreadVideoIds;
}

export async function downloadVideo(videoId: string, videoRevId: string): Promise<void> {
    const token = useAuthStore.getState().token;
    const res = await fetch(
        `/api/videos/download?videoId=${videoId}&videoRevId=${videoRevId}`,
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.click();

    URL.revokeObjectURL(url);
}

export async function fetchMediaUrl(filePath: string): Promise<string> {
    const res = await fetch(`/api/media/${encodeURI(filePath)}`);
    return (await res.json()).url;
}