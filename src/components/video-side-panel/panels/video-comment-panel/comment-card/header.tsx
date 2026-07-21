"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEllipsisV,
    faBug,
    faListCheck,
    faTrash,
    faPen,
    faLink,
} from "@fortawesome/free-solid-svg-icons";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { captureFrame, formatDate, formatTime } from "@/lib/utils";
import { createVideoCommentLink } from "@/lib/url";
import { useCommentStore } from "@/stores/comment-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { VideoComment } from "@/lib/db-types";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { ShareLinkDialog } from "@/components/dialog/share-link";
import { useEffect, useMemo, useState } from "react";
import { CardHeader } from "@/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { useTranslations } from "next-intl";
import { isViewer } from "@/lib/role";
import { useAvatarStore } from "@/stores/avatar-store";
import { env } from "@/lib/env";

// Dropdown menu item for copying a shareable link to the selected comment.
function DropdownMenu_SharedLink() {
    const t = useTranslations("video-comment-panel");
    const [open, setOpen] = useState(false);
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { selectedComment, videoRefElement } = useVideoReviewStore();

    const createLink = () => {
        if (!selectedVideo) {
            return "";
        }

        if (selectedComment === null || selectedRevision === null) {
            return "";
        }
        return createVideoCommentLink(window.location.origin, selectedVideo?.id, selectedComment?.id) ?? "";
    }

    return (
        <>
            <DropdownMenuItem className="gap-2"
                onClick={() => { setOpen(true) }}
                onSelect={(e) => { e.preventDefault() }}>
                <FontAwesomeIcon icon={faLink} />
                {t("commentItemCopyLink")}
            </DropdownMenuItem>
            <ShareLinkDialog url={createLink()} open={open} onOpenChange={setOpen} />
        </>
    );
}

// Dropdown menu item for creating a Jira issue from a comment.
function DropdownMenu_CreateIssue(props: { disabled: boolean, comment: VideoComment, translateID: string }) {
    const t = useTranslations("video-comment-panel");
    const { issueLinkedComment } = useCommentStore();
    const { email } = useAuthStore();
    const { videoRefElement } = useVideoReviewStore();

    // NOTE:
    // Issue type and icon are currently derived from translation IDs.
    // This couples UI text with logic, but keeps the menu definition simple for now.
    // Intended to be refactored to an explicit enum or prop-based issue type in the future.
    const issueType = props.translateID === "commentItemTask" ? env.PUBLIC_JIRA_ISSUE_TYPE_TASK : env.PUBLIC_JIRA_ISSUE_TYPE_BUG
    const icon = props.translateID === "commentItemTask" ? faListCheck : faBug;

    return (
        <DropdownMenuItem disabled={props.disabled} className="gap-2" onClick={async () => {
            if (issueType === undefined || email === null) return;
            const screenshot = await captureFrame(videoRefElement)
            await issueLinkedComment(props.comment.id, email, issueType, screenshot);
        }}>
            <FontAwesomeIcon icon={icon} />
            {t(props.translateID)}
        </DropdownMenuItem>
    );
}

// Dropdown menu item for entering comment edit mode.
function DropdownMenu_Edit(props: { comment: VideoComment }) {
    const t = useTranslations("video-comment-panel");
    const { setEditing } = useCommentEditStore();

    return (
        <DropdownMenuItem className="gap-2" onClick={() => setEditing(props.comment)}>
            <FontAwesomeIcon icon={faPen} />
            {t("commentItemEdit")}
        </DropdownMenuItem>
    );
}

// Dropdown menu item for deleting a comment.
function DropdownMenu_Delete(props: { comment: VideoComment }) {
    const t = useTranslations("video-comment-panel");
    const { deleteComment } = useCommentStore();

    return (
        <DropdownMenuItem className="gap-2 text-red-400" onClick={async () => await deleteComment(props.comment.id)}>
            <FontAwesomeIcon icon={faTrash} />
            {t("commentItemRemove")}
        </DropdownMenuItem>
    );
}

export default function CommentCardHeader(props: { comment: VideoComment }) {
    const { role } = useAuthStore();
    const { icon, fetchAvatar } = useAvatarStore();

    useEffect(() => {
    
        void (async () => {
            try {
                await fetchAvatar(props.comment.userEmail);
            } catch { }
        })();
    }, [props.comment.userEmail]);

    return (
        <CardHeader className="flex flex-row items-center justify-between px-3 pb-1">
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    {icon(props.comment.userEmail) ? (<><AvatarImage src={icon(props.comment.userEmail)} /></>) : (<><AvatarFallback/></>)}
                    
                </Avatar>
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-medium">{props.comment.userName}</span>
                    <span className="text-xs text-[#888]">
                        {formatDate(props.comment.createdAt)} : Rev.{props.comment.videoRevNum}
                    </span>
                </div>
            </div>

            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#aaa] hover:bg-[#7d7d7d] w-8 h-8"
                    >
                        <FontAwesomeIcon icon={faEllipsisV} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#181818] text-white border-[#333]">
                    <DropdownMenu_SharedLink />
                    <DropdownMenu_CreateIssue disabled={(props.comment.issueId !== "" && props.comment.issueId !== null) || !isViewer(role)} comment={props.comment} translateID="commentItemTask" />
                    <DropdownMenu_CreateIssue disabled={(props.comment.issueId !== "" && props.comment.issueId !== null) || !isViewer(role)} comment={props.comment} translateID="commentItemBug" />
                    <DropdownMenu_Edit comment={props.comment} />
                    <DropdownMenu_Delete comment={props.comment} />
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
    );
}