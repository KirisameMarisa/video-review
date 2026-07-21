"use client";

import { CardContent } from "@/ui/card";
import { formatTime } from "@/lib/utils";
import { VideoEventWithKind } from "@/lib/db-types";

export default function EventCardContent(props: { event: VideoEventWithKind }) {
    return (
        <CardContent className="px-3">
            <p className="text-sm text-[#ccc] whitespace-pre-line">
                {props.event.data}
            </p>
        </CardContent>
    );
}
