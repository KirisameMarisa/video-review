"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/ui/dropdown-menu";
import { Separator } from "@/ui/separator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEllipsisV,
    faBug,
    faListCheck,
    faTrash,
    faPen,
    faComment,
    faThumbsUp,
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
import CommentConfirmed from "@/components/comment-confirmed";
import { useDrawingStore } from "@/stores/drawing-store";
import { ShareLinkDialog } from "@/components/share-link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { CommentFilterParam, CommentSearchPopover } from "@/components/comment-search";
import { readVideoComment } from "@/lib/fetch-wrapper";
import { useTranslations } from "next-intl";
import { isViewer, Role } from "@/lib/role";
import { slackToast } from "@/components/slack";

export default function VideoCommentPanel() {
    const t = useTranslations("video-comment-panel");
    const headerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [newComments, setNewComments] = useState<VideoComment[]>([]);

    const { displayName, email, userId, role } = useAuthStore();

    const {
        revisions,
        selectedVideo,
        selectedRevision,
    } = useVideoStore();

    const {
        editingComment,
        setEditing,
        setEditDrawingPath,
        setEditComment,
        setEditIssueId,
        editSave,
    } = useCommentEditStore();

    const revisionNums = useMemo<number[]>(() => {
        return revisions.map(v => v.revision).sort((a, b) => a - b);
    }, [revisions]);

    const { canvasSave } = useDrawingStore();

    const { setDisplayComments, comments, incrementThumbsUpCount, deleteComment, addComment, issueLinkedComment } = useCommentStore();

    const { selectedComment, setSelectComment, videoRefElement, currentTime, activeComments, setTimelineTime } = useVideoReviewStore();

    const [commentFilterParam, setCommentFilterParam] = useState<CommentFilterParam>();

    const filteredComments = useMemo<VideoComment[]>(() => {
        const f = commentFilterParam;

        if (f === undefined || f.fetchMode === "fetchAll") {
            return comments;
        }

        const filteredComments: VideoComment[] = []
        for (const comment of comments) {
            const revisionContains = f.revRange.revFrom <= comment.videoRevNum && comment.videoRevNum <= f.revRange.revTo;

            if (!revisionContains) {
                continue;
            }

            const matchFiltered = comment.comment.includes(f.filterText) || comment.userName.includes(f.filterText);
            if (!matchFiltered) {
                continue;
            }
            filteredComments.push(comment);
        }

        return filteredComments;
    }, [comments, commentFilterParam]);

    useEffect(() => {
        if(!userId || !selectedVideo) return;
        readVideoComment(userId, selectedVideo.id);
    }, [comments]);

    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const handleCommentConfirmed = async (comment: string, issueId: string) => {
        if (!editingComment) {
            if (selectedRevision) {
                const id = await addComment({
                    videoId: selectedRevision?.videoId,
                    videoRevNum: selectedRevision?.revision,
                    userName: displayName ?? "unknown",
                    comment: comment,
                    issueId: issueId,
                    time: currentTime,
                    userEmail: email ?? "",
                    thumbsUp: 0,
                })
                
                await handlePostCommentToSlack(id);
            }
        } else {
            const drawingPath = await canvasSave(editingComment.drawingPath ?? null);
            setEditDrawingPath(drawingPath);
            setEditComment(comment);
            setEditIssueId(issueId);
            editSave();
        }
    }

    const handleIssueLinkedComment = async (id: string, issueType: string | undefined) => {
        if(issueType === undefined) {
            return;
        }

        const screenshot = await captureFrame(videoRefElement)
        await issueLinkedComment(id, email!, issueType, screenshot);
    }

    const handlePostCommentToSlack = async (id: string) => {
        const screenshot = await captureFrame(videoRefElement);
        await slackToast(id, screenshot);
    }

    const createLink = () => {
        if (!selectedVideo) {
            return "";
        }

        if (selectedComment === null || selectedRevision === null) {
            return "";
        }
        return createVideoCommentLink(selectedVideo?.id, selectedComment) ?? "";
    }

    const handleSelectComment = (comment: VideoComment) => {
        setTimelineTime(comment.time)
        setSelectComment(comment);
    }

    const handleLike = (id: string) => {
        incrementThumbsUpCount(id);
    }

    useEffect(() => {
        let target = filteredComments[0];
        if (target === undefined || !headerRef?.current) {
            return;
        }

        for (let i = 0; i < filteredComments.length; i++) {
            if (filteredComments[i].time <= currentTime) {
                target = filteredComments[i];
            }
            else break;
        }

        const headerHeight = headerRef.current.getBoundingClientRect().height;
        const el = commentCardRefs.current[target.id];

        if (!el || !containerRef.current) return;

        // スクロール
        containerRef.current.scrollTo({
            top: el.offsetTop - headerHeight,
            behavior: "smooth",
        });
    }, [currentTime, filteredComments]);

    useEffect(() => {
        if (!revisionNums || revisionNums.length === 0) return;

        const lastIndex = revisionNums.length - 1;
        const revTo = revisionNums[lastIndex];

        const fromIndex = Math.max(0, lastIndex - 3);
        const revFrom = revisionNums[fromIndex];

        setCommentFilterParam({
            fetchMode: "fetchRange",
            filterText: "",
            revRange: { revFrom: revFrom, revTo: revTo }
        });
    }, [revisionNums]);

    useEffect(() => {
        setDisplayComments(filteredComments);
    }, [filteredComments]);

    useEffect(() => {
        if (!selectedComment) return;
        if (editingComment && editingComment.id !== selectedComment.id) {
            setEditing(null);
        }
        setNewComments((prev) => prev.filter((c) => c.id !== selectedComment.id));
    }, [selectedComment]);

    return (
        <div className="vr-panel vr-scrollbar">
            {/* コメント一覧 */}
            <div ref={headerRef} className="vr-header">
                <div>
                    <span className="px-2">{t("title")}</span>
                    <CommentSearchPopover
                        revisions={revisionNums}
                        commentFilterParam={commentFilterParam}
                        updateCommentFilter={setCommentFilterParam}
                    />
                </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {filteredComments.map((comment, i) => {
                    const isNew = newComments.some(e => e.id === comment.id);
                    const isActive = activeComments.some(e => e.id === comment.id);
                    const isSelected = selectedComment?.id === comment.id;
                    return (
                        <Card
                            ref={el => {
                                commentCardRefs.current[comment.id] = el;
                            }}
                            key={comment.id}
                            className={`bg-[#222] border border-[#333] text-white hover:bg-[#252525] transition cursor-pointer
                                ${isSelected ? "border-[#ff8800] bg-[#3a2b00]" : isActive ? "border-[#666]" : ""}`}
                            onClick={() => handleSelectComment(comment)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between px-3 pb-1">
                                <div className="flex items-center gap-3">
                                    {/* アバター */}
                                    <Avatar className="h-8 w-8">
                                        {isViewer(role) && comment.userEmail ? (
                                            <AvatarImage src={`/api/v1/integrations/jira/avatar?email=${comment.userEmail}`} />
                                        ) : (
                                            <AvatarFallback>{comment.userName?.[0]?.toUpperCase()}</AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-sm font-medium">{comment.userName}</span>
                                        <span className="text-xs text-[#ddd]">
                                            {/* NEW バッジ */}
                                            {isNew && (
                                                <span className="text-[10px] bg-[#ff3300] text-white  px-1 py-0.5 rounded">{t("newBadge")}</span>
                                            )}
                                            {formatTime(comment.time)}
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
                                        <DropdownMenuShaderLinkItem url={createLink()} />

                                        <DropdownMenuItem disabled={comment.issueId !== "" || !isViewer(role)} className="gap-2" onClick={async () => await handleIssueLinkedComment(comment.id, process.env.NEXT_PUBLIC_JIRA_ISSUE_TYPE_TASK)}>
                                            <FontAwesomeIcon icon={faListCheck} />
                                            {t("commentItemTask")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled={comment.issueId !== "" || !isViewer(role)} className="gap-2" onClick={async () => await handleIssueLinkedComment(comment.id, process.env.NEXT_PUBLIC_JIRA_ISSUE_TYPE_BUG)}>
                                            <FontAwesomeIcon icon={faBug} />
                                            {t("commentItemBug")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2" onClick={() => setEditing(comment)}>
                                            <FontAwesomeIcon icon={faPen} />
                                            {t("commentItemEdit")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 text-red-400" onClick={async () => await deleteComment(comment.id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                            {t("commentItemRemove")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>

                            <CardContent className="px-3">
                                {comment.issueId && (
                                    <a
                                        className="text-[#4ea7ff] text-xs hover:underline"
                                        href={`${process.env.NEXT_PUBLIC_JIRA_BASE_URL!}/browse/${comment.issueId}`}
                                        target="_blank"
                                    >
                                        {comment.issueId}
                                    </a>
                                )}

                                <p className="text-sm text-[#ccc] whitespace-pre-line">{comment.comment}</p>
                            </CardContent>

                            <CardFooter className="flex items-center justify-between px-3 py-0.5">
                                {/* 👍 ライクボタン */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLike(comment.id);
                                    }}
                                    className="flex items-center gap-1 text-[#ccc] hover:text-[#ff8800] transition"
                                >
                                    <FontAwesomeIcon icon={faThumbsUp} />
                                    <span className="text-xs">{comment.thumbsUp ?? 0}</span>
                                </button>

                                <span className="text-xs text-[#888]">
                                    {formatDate(comment.createdAt)}
                                </span>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            <Separator className="bg-[#333]" />

            {/* コメント入力欄 */}
            <CommentConfirmed
                confirmedLabel={editingComment ? "commentUpdate"  : "commentAdd"}
                comment={editingComment ? editingComment.comment : ""}
                issueId={editingComment ? editingComment.issueId ?? "" : ""}
                onCancel={() => setEditing(null)}
                onConfirmed={async (comment, issueId) => await handleCommentConfirmed(comment, issueId)}
            />
        </div>
    );
}

function DropdownMenuShaderLinkItem({ url }: { url: string }) {
    const t = useTranslations("video-comment-panel");
    const [open, setOpen] = useState(false);

    return (
        <>
            <DropdownMenuItem className="gap-2" 
            onClick={() => setOpen(true)}
            onSelect={(e) => e.preventDefault()}>
                <FontAwesomeIcon icon={faLink} />
                {t("commentItemCopyLink")}
            </DropdownMenuItem>
            <ShareLinkDialog url={url} open={open} onOpenChange={setOpen}/>
        </>
    );
}
