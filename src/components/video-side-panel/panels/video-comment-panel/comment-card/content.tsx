"use client";

import { CardContent } from "@/ui/card";
import { VideoComment } from "@/lib/db-types";
import { formatTime } from "@/lib/utils";


export default function CommentCardContent(props: { comment: VideoComment }) {
    return (
        <CardContent className="px-3">
            <p className="text-sm text-[#ccc] whitespace-pre-line">
                <span className="border border-[#7f783d] text-xs text-[#eae60b] bg-[#7f783d] rounded">{formatTime(props.comment.time)}</span>
                {props.comment.comment}
            </p>
        </CardContent>
    );
}
