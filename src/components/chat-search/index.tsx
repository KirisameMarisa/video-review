"use client";

import React, { useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChatSearchStore } from "@/stores/chat-search-store";
import { useLLMStatusStore } from "@/stores/llm-status-store";
import { ChatMessage } from "@/components/chat-search/chat-message";
import { ChatInput } from "@/components/chat-search/chat-input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

export function ChatSearchPanel() {
    const t = useTranslations("chat-search");
    const { isOpen, close, history, isLoading, error, sendMessage, clear } = useChatSearchStore();
    const { available } = useLLMStatusStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isLoading]);

    return (
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
            <SheetContent
                side="right"
                className="w-100 sm:w-120 bg-[#181818] border-l border-[#333] p-0 flex flex-col"
            >
                <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-[#333] shrink-0">
                    <SheetTitle className="text-[#ff8800] text-sm font-semibold">
                        {t("title")}
                    </SheetTitle>
                    <div className="flex items-center gap-2">
                        {history.length > 0 && (
                            <button
                                onClick={clear}
                                className="text-[#666] hover:text-[#aaa] transition-colors"
                                title={t("clearHistory")}
                            >
                                <Trash2 className="size-4" />
                            </button>
                        )}
                        <button
                            onClick={close}
                            className="text-[#666] hover:text-[#aaa] transition-colors"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </SheetHeader>

                {!available ? (
                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                        <p className="text-[#666] text-sm">
                            {t("llmUnavailable")}
                            
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}>
                            {history.length === 0 && (
                                <p className="text-[#555] text-xs text-center mt-4">
                                    {t("emptyState")}
                                </p>
                            )}
                            {history.map((turn, i) => (
                                <ChatMessage key={i} turn={turn} />
                            ))}
                            {isLoading && (
                                <div className="flex items-start">
                                    <div className="bg-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#666]">
                                        {t("loading")}
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div className="text-xs text-red-400 text-center">{error}</div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                        <ChatInput onSend={sendMessage} disabled={isLoading} />
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
