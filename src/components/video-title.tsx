"use client";
import { useRef, useState } from "react";
import { useVideoStore } from "@/stores/video-store";
import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { Badge } from "@/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPlus } from "@fortawesome/free-solid-svg-icons";

export default function VideoTitle() {
    const t = useTranslations("video-title");

    const {
        selectedVideo,
        revisions,
        selectedRevision,
        allVideoTags,
        selectVideoRevision,
        updateRevisionTags,
    } = useVideoStore();

    const [inputVisible, setInputVisible] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const currentTags: string[] = selectedRevision?.tags ?? [];

    const suggestions = allVideoTags.filter(
        (t) => t.toLowerCase().includes(inputValue.toLowerCase()) && !currentTags.includes(t)
    );

    const addTag = async (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed || !selectedRevision || currentTags.includes(trimmed)) return;
        await updateRevisionTags(selectedRevision.id, [...currentTags, trimmed]);
        setInputValue("");
        setInputVisible(false);
    };

    const removeTag = async (tag: string) => {
        if (!selectedRevision) return;
        await updateRevisionTags(selectedRevision.id, currentTags.filter((t) => t !== tag));
    };

    return (
        <div className="py-1 px-2 mb-2 flex items-center justify-between">
            <div className="min-w-0">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1 px-2 text-lg font-semibold text-[#ff8800] tracking-wide">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <span className="truncate">{selectedVideo?.title ?? t("noSelection")}</span>
                    </h2>
                    {revisions.length > 1 && (
                        <select
                            className="bg-[#202020] border border-[#333] text-sm rounded px-2 py-1 text-[#eee] hover:border-[#ff8800] transition"
                            value={selectedRevision?.id ?? ""}
                            onChange={(e) => {
                                const rev = revisions.find((r) => r.id === e.target.value);
                                if (rev) selectVideoRevision(rev);
                            }}
                        >
                            {revisions.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {t("revisionOption", {
                                        revision: r.revision,
                                        date: new Date(r.uploadedAt).toLocaleDateString("ja-JP")
                                    })}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <p className="text-xs text-[#999] mt-1">
                    {selectedRevision
                        ? t("revisionInfo", {
                            revision: selectedRevision.revision,
                            uploadedAt: new Date(selectedRevision.uploadedAt)
                                .toLocaleString()
                        })
                        : t("noRevision")}
                </p>

                {selectedRevision && (
                    <div className="px-2 mt-2">
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] text-[#888]">
                                {t("tagsLabel")}:
                            </span>
                            {currentTags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="border-[#333] bg-[#202020] text-[#eee] gap-1 pr-1"
                                >
                                    {tag}
                                    <button
                                        onClick={() => void removeTag(tag)}
                                        className="text-[#666] hover:text-[#ff4444] transition"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                    </button>
                                </Badge>
                            ))}

                            {inputVisible ? (
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        autoFocus
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") void addTag(inputValue);
                                            if (e.key === "Escape") {
                                                setInputVisible(false);
                                                setInputValue("");
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!inputValue) {
                                                setInputVisible(false);
                                            }
                                        }}
                                        className="bg-[#2a2a2a] border border-[#555] text-[#eee] text-xs rounded px-2 py-0.5 w-28 outline-none focus:border-[#ff8800]"
                                        placeholder={t("tagInputPlaceholder")}
                                    />
                                    {suggestions.length > 0 && inputValue && (
                                        <div className="absolute top-full left-0 mt-1 z-50 bg-[#2a2a2a] border border-[#444] rounded shadow-lg min-w-30">
                                            {suggestions.slice(0, 6).map((s) => (
                                                <button
                                                    key={s}
                                                    onMouseDown={(e) => { e.preventDefault(); void addTag(s); }}
                                                    className="w-full text-left text-xs text-[#eee] px-2 py-1 hover:bg-[#ff8800] hover:text-black transition"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setInputVisible(true)}
                                    className="text-[#555] hover:text-[#ff8800] transition"
                                    title={t("addTag")}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
