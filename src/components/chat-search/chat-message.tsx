"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChatTurn } from "@/lib/fetch-wrapper/chat-search";

export function ChatMessage({ turn }: { turn: ChatTurn }) {
    const isUser = turn.role === "user";
    return (
        <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
            <div
                className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isUser
                        ? "bg-[#ff8800] text-black"
                        : "bg-[#2a2a2a] text-[#ddd]",
                )}
            >
                {turn.content}
            </div>
        </div>
    );
}
