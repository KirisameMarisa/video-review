"use client";

import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { useEffect, useState } from "react";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";

export type ECommentConfirmedType = "commentUpdate" | "commentAdd";

export default function CommentConfirmed(props: {
    confirmedLabel: ECommentConfirmedType;
    onConfirmed: (comment: string, issueId: string) => void;
    onCancel: () => void;
    issueId: string;
    comment: string;
}) {
    const t = useTranslations("comment-confirmed");
    const [comment, setComment] = useState(props.comment);
    const [issueId, setIssueId] = useState(props.issueId);
    const { setIsPlaying } = useVideoPlayerStore();
    const { canUseIssueTracker } = useAuthStore();

    const handleConfirmed = () => {
        props.onConfirmed(comment, issueId);
        setIssueId("");
        setComment("");
    };

    const handleCancel = () => {
        props.onCancel();
    };

    useEffect(() => {
        setComment(props.comment);
        setIssueId(props.issueId);
    }, [props.comment, props.issueId]);

    return (
        <div className="p-4 border-t border-[#333] bg-[#1c1c1c]">
            <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onFocus={() => setIsPlaying(false)}
                placeholder={t("editComment")}
                className="bg-[#222] border-[#333] text-white resize-none h-20 mb-2"
            />
            <input
                disabled={!canUseIssueTracker}
                className={
                    `bg-zinc-800 p-2 rounded text-white w-full mb-2 transition ${!canUseIssueTracker ? "bg-zinc-900 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-70" : ""}`
                }
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
                onFocus={() => setIsPlaying(false)}
                placeholder={t("editIssueLink")}
            />
            {props.confirmedLabel === "commentUpdate" ? (
                <div className="flex gap-2">
                    <Button
                        onClick={() => handleConfirmed()}
                        className="flex-1 bg-[#ff3300] hover:bg-[#ff9a1a] text-black font-semibold"
                    >
                        {t(props.confirmedLabel)}
                    </Button>
                    <Button
                        onClick={() => handleCancel()}
                        variant="secondary"
                        className="flex-1 bg-zinc-700 text-white hover:bg-zinc-600"
                    >
                        {t("cancel")}
                    </Button>
                </div>
            ) : (
                <Button
                    onClick={() => handleConfirmed()}
                    className="w-full bg-[#ff8800] hover:bg-[#ff9a1a] text-black font-semibold"
                >
                    {t(props.confirmedLabel)}
                </Button>
            )}
        </div>
    );
}
