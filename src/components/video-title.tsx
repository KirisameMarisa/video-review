"use client";
import React from "react";
import { useVideoStore } from "@/stores/video-store";
import { useTranslations } from "next-intl";

export default function VideoTitle() {
    const t = useTranslations("video-title");
    
    const {
        selectedVideo,
        revisions,
        selectedRevision,
        selectVideoRevision,
    } = useVideoStore();

    return (
        <div className="px-2 mb-2 flex items-center justify-between">
            <div>
                <h2 className="text-lg font-semibold text-[#ff8800] tracking-wide">
                    {selectedVideo?.title ?? t("noSelection")}
                </h2>
                <p className="text-xs text-[#999] mt-1">
                    {selectedRevision
                        ? t("revisionInfo", {
                              revision: selectedRevision.revision,
                              uploadedAt: new Date(selectedRevision.uploadedAt)
                              .toLocaleString()
                          })
                        : t("noRevision")}
                </p>
            </div>

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
    );
}
