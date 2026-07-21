"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp, faComment, faPalette } from "@fortawesome/free-solid-svg-icons";
import { useCommentStore } from "@/stores/comment-store";
import { VideoComment } from "@/lib/db-types";
import { CardFooter } from "@/ui/card";
import { Badge } from "@/ui/badge";
import * as api from "@/lib/fetch-wrapper"
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CommentCardFooter(props: { comment: VideoComment }) {
    const { incrementThumbsUpCount } = useCommentStore();
    const [externalLinks, setExternalLinks] = useState<Record<string, string> | null>(null);

    const handleLike = (id: string) => {
        incrementThumbsUpCount(id);
    }

    const openExternalLink = async (type: "slack" | "jira") => {
        // jump from cache
        if (externalLinks?.[type]) {
            window.open(externalLinks[type], "_blank", "noreferrer");
            return;
        }

        const res = await api.fetchExternalLink(props.comment.id);
        if (!res.ok) {
            return;
        }

        setExternalLinks(res.data);
        if (res.data[type]) {
            window.open(res.data[type], "_blank", "noreferrer");
        }
    }

    const hasIssueId = props.comment.issueId !== "" && props.comment.issueId !== null;
    const notifiedProviders = props.comment.notifiedProviders;
    const hasSlackMessage = notifiedProviders.includes("slack");
    const hasDrawing = props.comment.drawingPath !== "" && props.comment.drawingPath !== null;

    return (
        <CardFooter className="flex justify-end px-2">
            <div>
                <div className="flex w-full gap-1">
                    {hasIssueId && (
                        <Badge className="bg-white hover:bg-[#333]">
                            <button
                                onClick={async () => await openExternalLink("jira")}
                                className="flex items-center gap-1 hover:text-[#ff8800] transition text-[#4ea7ff] text-xs hover:underline hover:text-[#ff8800]"
                            >
                                {props.comment.issueId}
                            </button>
                        </Badge>
                    )}
                    {hasSlackMessage && (
                        <Badge className="bg-white hover:bg-[#333]">
                            <button
                                onClick={async () => await openExternalLink("slack")}
                                className="flex items-center gap-1 text-black hover:text-[#ff8800] transition"
                            >
                                <FontAwesomeIcon icon={faComment}/>
                                <span className="text-xs">Slack</span>
                            </button>
                        </Badge>
                    )}

                    {hasDrawing && (
                        <Badge className="bg-white hover:bg-[#333]">
                            <button className="flex items-center gap-1 text-black hover:text-[#ff8800] transition">
                            <FontAwesomeIcon icon={faPalette} size="xl"/>
                            </button>
                        </Badge>
                    )}


                    <Badge className="bg-white hover:bg-[#333]">
                        {/* 👍 like button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike(props.comment.id);
                            }}
                            className="flex items-center gap-1 text-black hover:text-[#ff8800] transition"
                        >
                            <FontAwesomeIcon icon={faThumbsUp} />
                            <span className="text-xs">{props.comment.thumbsUp ?? 0}</span>
                        </button>
                    </Badge>
                </div>
            </div>
        </CardFooter>
    );
}

