"use client";

import React, { useEffect } from "react";
import { BrushCleaning, Plus, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";
import { isGuest, isViewer } from "@/lib/role";
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

export default function VideoListPanelHeader(
    { ref, onSearchDialogShow, onUploadDialogShow }
        : {
            ref: React.RefObject<HTMLDivElement | null>;
            onSearchDialogShow: () => void;
            onUploadDialogShow: () => void;
        }) {
    const t = useTranslations("video-list-panel");
    const { role } = useAuthStore();
    const { fetchVideos } = useVideoStore();
    const { filterTree, setFilterTree, isFiltering, clear } = useVideoSearchStore();

    useEffect(() => {
        fetchVideos();
    }, [filterTree]);

    const handleClear = () => {
        clear();
        fetchVideos();
    }

    return (
        <SidebarHeader
            ref={ref}
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
                                    <BrushCleaning className="size-5" />
                                </button>
                            </>
                        )
                        : (<></>)
                    }
                </div>

                <button
                    hidden={isGuest(role)}
                    onClick={() => onUploadDialogShow()}
                    className="text-lg leading-none hover:text-[#fbba5e]"
                >
                    <Plus />
                </button>
            </div>
            <SidebarGroup className="py-0">
                <SidebarGroupContent className="relative">
                    <SidebarInput
                        value={filterTree}
                        onChange={(e) => setFilterTree(e.target.value)}
                        placeholder="Filter..."
                        className="pl-8 border-[#444] w-full h-8 rounded bg-[#181818] border text-sm text-white" />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarHeader>
    );
}
