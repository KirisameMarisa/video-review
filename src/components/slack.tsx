"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import { toast } from "sonner";
import { createOpenSceneLink, createVideoCommentLink } from "@/lib/url";
import * as api from "@/lib/fetch-wrapper";

export async function slackToast(commentId: string, screenshot: Blob | null): Promise<boolean> {
    const token = useAuthStore.getState().token;

    if (screenshot === null) {
        return false;
    }

    const ctx = buildCommentContext(commentId);
    if (!ctx) {
        return false;
    }

    const slackText = createSlackTextFromContext(ctx)!;
    const toastData = createSlackToastFromContext(ctx)!;

    const ret = api.postToSlack(slackText, screenshot);
    if(!ret) {
        return false;
    }

    toast.custom(() => (
        <div className="flex gap-3 rounded-md bg-zinc-900 p-3 text-white shadow">
            <img
                src={URL.createObjectURL(screenshot)}
                className="h-16 w-16 rounded object-cover"
            />
            <div className="flex flex-col gap-0.5">
                <div className="text-sm font-semibold">
                    {toastData.title}
                </div>
                <div className="text-xs line-clamp-2">
                    {toastData.comment}
                </div>
            </div>
        </div>
    ));
    return true;
}

function buildCommentContext(commentId: string) {
    const comment = useCommentStore.getState().comments.find(c => c.id === commentId);
    if (!comment) return null;

    const video = useVideoStore.getState().selectedVideo;
    if (!video) return null;

    const user = useAuthStore.getState();

    return {
        commentId: comment.id,
        commentText: comment.comment,
        videoId: comment.videoId,
        videoTitle: video.title,
        folderKey: video.folderKey,
        scenePath: video.scenePath,
        userName: user.displayName,
        videoLink: createVideoCommentLink(comment.videoId, comment),
        sceneLink: video.scenePath
            ? createOpenSceneLink(video.scenePath)
            : null,
    };
}

function createSlackTextFromContext(ctx: ReturnType<typeof buildCommentContext>) {
    if (!ctx) return null;

    let text = "";
    text += `${ctx.folderKey}/${ctx.videoTitle}\n`;
    text += `${ctx.userName}\n`;
    text += `${ctx.commentText}\n`;
    text += `<${ctx.videoLink}|VideoReview LINK>\n`;

    if (ctx.sceneLink) {
        text += `<${ctx.sceneLink}|Open Scene>\n`;
    }

    return text;
}

function createSlackToastFromContext(ctx: ReturnType<typeof buildCommentContext>) {
    if (!ctx) return null;

    return {
        title: "Posted to Slack",
        comment: ctx.commentText,
    };
}