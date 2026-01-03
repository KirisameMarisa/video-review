import { useAuthStore } from "@/stores/auth-store";
import { VideoComment } from '@/lib/db-types';

export async function fetchComments(videoId: string): Promise<VideoComment[]> {
    const res = await fetch(`/api/v1/comments?videoId=${videoId}`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
}

export async function fetchNewComments(videoId: string, lastFetchedAt: number) {
    const res = await fetch(
        `/api/v1/comments?videoId=${videoId}&since=${new Date(
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
    const res = await fetch("/api/v1/comments", {
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
    issueId?: string | null;
    drawingPath?: string | null;
    thumbsUp?: boolean;
}) {
    const res = await fetch("/api/v1/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update comment");
    return res.json();
}

export async function incrementThumbsUpCount(id: string) {
    const res = await fetch("/api/v1/comments", {
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
    const res = await fetch("/api/v1/comments", {
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
    const res = await fetch(`/api/v1/comments/${commentId}`);
    if (!res.ok) throw new Error("Failed to comment");
    return res.json();
}

export async function fetchLastUpdated(videoId: string): Promise<number> {
    const email = useAuthStore.getState().email;
    const res = await fetch(
        `/api/v1/comments/last-updated?videoId=${videoId}&email=${email}`,
    );
    if (!res.ok) throw new Error("Failed to fetch comments");
    const json = await res.json();
    return new Date(json.updatedAt).getTime();
}

export async function fetchLatestCommentId(
    videoId: string,
): Promise<string | null> {
    const res = await fetch(`/api/v1/read-status/latest?videoId=${videoId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.latestCommentId;
}

export async function readVideoComment(userId: string, videoId: string) {
    const lastReadCommentId = await fetchLatestCommentId(videoId);
    if (!lastReadCommentId) {
        return;
    }

    await fetch("/api/v1/read-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId,
            videoId,
            lastReadCommentId,
        }),
    });
}

export async function hasUnreadVideoComment(userId: string): Promise<string[]> {
    const res = await fetch(`/api/v1/read-status/unread?userId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("failed to get unread comment info");
    const json = await res.json();
    return json.unreadVideoIds;
}

export async function fetcCommentUsers(
    data: {
        videoId?: string,
        rev?: { from?: number, to?: number },
        hasDrawing?: boolean,
        hasIssue?: boolean,
    }
): Promise<{userName: string, userEmail: string}[]> {
    const params = new URLSearchParams();
    if (data.videoId) params.set("from", data.videoId);
    if (data.hasDrawing) params.set("hasDrawing", data.hasDrawing ? "true" : "false");
    if (data.hasIssue) params.set("hasIssue", data.hasIssue ? "true" : "false");
    if (data.rev) {
        if (data.rev.from) params.set("to", data.rev.from.toString());
        if (data.rev.to) params.set("to", data.rev.to.toString());
    }

    const res = await fetch(`/api/v1/comments/users?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    return await res.json();
}
