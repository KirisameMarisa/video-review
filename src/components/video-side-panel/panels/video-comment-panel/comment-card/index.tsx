"use client";

import { useVideoReviewStore } from "@/stores/video-review-store";
import { VideoComment } from "@/lib/db-types";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import React, { useEffect } from "react";
import TimelineCardList from "@/components/video-side-panel/timeline-card-list";
import CommentCardHeader from "@/components/video-side-panel/panels/video-comment-panel/comment-card/header";
import CommentCardContent from "@/components/video-side-panel/panels/video-comment-panel/comment-card/content";
import CommentCardFooter from "@/components/video-side-panel/panels/video-comment-panel/comment-card/footer";

export default function CommentCard(props: {
    comments: VideoComment[],
    containerRef: React.RefObject<HTMLDivElement | null>,
    commentCardRef: React.RefObject<Record<string, HTMLDivElement | null>>,
}) {
    const { editingComment, setEditing } = useCommentEditStore();
    const { selectedComment, setSelectComment, activeComments, setTimelineTime } = useVideoReviewStore();

    const handleSelectComment = (comment: VideoComment) => {
        setTimelineTime(comment.time)
        setSelectComment(comment);
    }

    useEffect(() => {
        if (!selectedComment) return;
        if (editingComment && editingComment.id !== selectedComment.id) {
            setEditing(null);
        }
    }, [selectedComment]);

    return (
        <TimelineCardList
            items={props.comments}
            containerRef={props.containerRef}
            itemCardRef={props.commentCardRef}
            getKey={(comment) => comment.id}
            getCardClassName={(comment) => {
                // Visual state rules for comment cards.
                // Priority order (later rules override earlier ones):
                // 1. Selected comment (explicit user focus)
                // 2. Active comment (currently relevant to playback time)
                // 3. Comment with both issue + drawing
                // 4. Comment with issue only
                // 5. Comment with drawing only
                const isActive = activeComments.some(e => e.id === comment.id);
                const isSelected = selectedComment?.id === comment.id;
                const hasDrawing = comment.drawingPath !== "" && comment.drawingPath !== null;
                const hasIssue = comment.issueId !== "" && comment.issueId !== null;

                let stateClass = "";
                if (hasIssue) {
                    stateClass = "border-[#32cd32]";
                } else if (hasDrawing) {
                    stateClass = "border-[#4aa3ff]";
                }

                if (hasIssue && hasDrawing) {
                    stateClass = "border-[#ffff00]";
                }

                if (isSelected) {
                    stateClass = "border-[#ff8800] bg-[#3a2b00]";
                } else if (isActive) {
                    stateClass = "border-[#ffffff]";
                }

                return stateClass;
            }}
            onClick={(comment) => { handleSelectComment(comment) }}
            renderHeader={(comment) => <CommentCardHeader comment={comment} />}
            renderContent={(comment) => <CommentCardContent comment={comment} />}
            renderFooter={(comment) => <CommentCardFooter comment={comment} />}
        />
    );
}
