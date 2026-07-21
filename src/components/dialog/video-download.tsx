"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { env } from "@/lib/env";
import ComboBox from "@/ui/combo-box";
import { ControlRow } from "@/ui/control-row";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { downloadVideo } from "@/lib/fetch-wrapper";

export function VideoDownloadDialog({ videoId, videoRevId, open, onClose }: { videoId: string; videoRevId: string; open: boolean; onClose: () => void }) {
    const t = useTranslations("video-download");
    const [selectedResolution, setSelectedResolution] = useState<number | undefined>(undefined);
    const resolutions = useMemo(() => {
        const res: Record<string, number | undefined> = {};
        res["original"] = undefined;
        env.RESOLUTION_PRESETS.forEach((w) => {
            res[`${w}p`] = w;
        });
        return res;
    }, []);

    useEffect(() => {
        if (open) {
            setSelectedResolution(undefined);
        }
    }, [open])

    const handleDownload = async () => {
        await downloadVideo(videoId, videoRevId, selectedResolution);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="bg-[#202020]">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    {ControlRow(t("selectRes"), () => {
                        return (
                            <div className="flex justify-between">
                                <ComboBox
                                    options={Object.entries(resolutions).map(([label, value]) => ({ label, value }))}
                                    setValue={(value) => setSelectedResolution(value)}
                                    value={selectedResolution}
                                    placeholder="resolution..."
                                    className="mx-2" />
                            </div>
                        );
                    })}
                </div>

                <DialogFooter>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="bg-[#333] text-white hover:bg-[#fff]"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleDownload}
                            className="bg-[#ff8800] text-white hover:bg-[#ee3300]"
                        >
                            {t("prepare")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

