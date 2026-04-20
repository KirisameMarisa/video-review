"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const t = useTranslations("chat-search");
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!disabled && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [disabled]);

    const handleSend = () => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && (e.shiftKey || e.metaKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex items-end gap-2 border-t border-[#333] p-3">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                placeholder={t("inputPlaceholder")}
                className="flex-1 resize-none bg-[#222] text-sm text-white placeholder-[#555] border border-[#444] rounded px-3 py-2 outline-none focus:border-[#ff8800] disabled:opacity-40"
                style={{ maxHeight: "120px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#333 #181818" }}
                onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                }}
            />
            <button
                onClick={handleSend}
                disabled={!value.trim() || disabled}
                className="mb-0.5 flex items-center justify-center size-8 rounded text-[#ff8800] hover:text-[#ffaa44] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <SendHorizontal className="size-4" />
            </button>
        </div>
    );
}
