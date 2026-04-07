"use client";

import React, { useEffect } from "react";
import { X, Plus, Search, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";
import { isGuest } from "@/lib/role";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInput,
} from "@/ui/sidebar"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { useVideoStore } from "@/stores/video-store";
import CalendarDateRadio from "@/ui/calendar-date-radio";
import { Separator } from "../ui/separator";
import { useLLMStatusStore } from "@/stores/llm-status-store";
import { useChatSearchStore } from "@/stores/chat-search-store";
import { ChatSearchPanel } from "@/components/chat-search";

export default function VideoListPanelHeader(
{ onSearchDialogShow, onUploadDialogShow }: { onSearchDialogShow: () => void; onUploadDialogShow: () => void;}) {
    const t = useTranslations("video-list-panel");
    const { role } = useAuthStore();
    const { fetchVideos } = useVideoStore();
    const { filterTree, setFilterTree, isFiltering, clear, videoDateRange, setVideoDateRange } = useVideoSearchStore();
    const { available, checked, check } = useLLMStatusStore();
    const { open: openChat } = useChatSearchStore();

    useEffect(() => {
        fetchVideos();
    }, [filterTree, videoDateRange]);

    useEffect(() => {
        if (!checked) check();
    }, []);

    const handleClear = () => {
        clear();
        fetchVideos();
    }

    return (
        <SidebarHeader
            style={{ color: "#ff8800" }}
            className="border-b p-3 font-semibold text-sm bg-[#181818] border-[#333]"
        >
            <div className="flex justify-between">
                <div>
                    <span>{t("title")}</span>
                    <button
                        onClick={() => onSearchDialogShow()}
                        className={`
                            inline-flex items-center justify-center
                            text-lg px-1 leading-none hover:text-[#ff5500]
                            ${isFiltering() ? "text-[#15fa34ff]" : ""}
                        `}
                    >
                        <FontAwesomeIcon icon={faSearch} />
                    </button>
                    {isFiltering()
                        ? (
                            <>
                                <button
                                    onClick={() => handleClear()}
                                    className="inline-flex items-center justify-center hover:text-[#ff5500]"
                                >
                                    <X className="size-5" />
                                </button>
                            </>
                        )
                        : (<></>)
                    }
                    <button
                        onClick={() => openChat()}
                        disabled={!available}
                        title={available ? undefined : "LLM is not configured"}
                        className={`
                            inline-flex items-center justify-center px-1 leading-none transition-colors
                            ${available ? "hover:text-[#ff5500]" : "opacity-30 cursor-not-allowed"}
                        `}
                    >
                        <MessageSquare className="size-4" />
                    </button>
                </div>

                <button
                    hidden={isGuest(role)}
                    onClick={() => onUploadDialogShow()}
                    className="text-lg leading-none hover:text-[#fbba5e]"
                >
                    <Plus />
                </button>
            </div>
            <Separator className="bg-[#333]" />

            <ChatSearchPanel />

            <SidebarGroup className="py-0">
                <CalendarDateRadio value={videoDateRange} onSetValue={setVideoDateRange} className="size-10" />

                <SidebarGroupContent className="relative mt-1">
                    <SidebarInput
                        value={filterTree}
                        onChange={(e) => setFilterTree(e.target.value)}
                        placeholder="Filter video..."
                        className="pl-8 border-[#fff] w-full h-8 rounded bg-[#181818] border text-sm text-white" />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarHeader>
    );
}
