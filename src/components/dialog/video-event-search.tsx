"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { ControlRow } from "@/ui/control-row";
import { useVideoEventSearchStore } from "@/stores/video-event-search-store";
import { Checkbox } from "@/ui/checkbox";
import ComboBox from "@/ui/combo-box";
import { Button } from "@/ui/button";
import { X } from "lucide-react";
import { useVideoStore } from "@/stores/video-store";
import { fetchVideoEventKinds } from "@/lib/fetch-wrapper";
import { useVideoEventStore } from "@/stores/video-event-store";

export function VideoEventSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("video-event-search");
    const [eventKinds, setEventKinds] = useState<{ label: string, value: string }[]>([]);
    const { selectedRevision } = useVideoStore();
    const { fetchEvents } = useVideoEventStore();
    const {
        filterText,
        kind,
        hasLink,
        setFilterText,
        setKind,
        setHasLink,
    } = useVideoEventSearchStore();

    useEffect(() => {
        void (async () => {
            const items = await fetchVideoEventKinds();
            setEventKinds(items.map((item) => ({ label: item, value: item })));
        })();
    }, [open]);

    const handleSearch = () => {
        if (selectedRevision) {
            fetchEvents(selectedRevision);
        }
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={() => { onClose() }}>
            <DialogContent className="bg-[#202020]">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 min-w-[360px]">
                    {ControlRow(t("searchFilter"), () => {
                        return (
                            <div className="flex justify-between">
                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="border-[#ccc] w-full h-8 rounded bg-[#181818] border px-2 text-sm text-white mx-2"
                                    placeholder="Filter event text..."
                                />
                                <Button onClick={() => { setFilterText("") }} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                    <X />
                                </Button>
                            </div>
                        );
                    })}

                    {ControlRow(t("kind"), () => {
                        return (
                            <div className="flex justify-between">
                                <ComboBox
                                    options={eventKinds}
                                    setValue={setKind}
                                    value={kind}
                                    placeholder="Select event kind..."
                                    className="mx-2"
                                />
                                <Button onClick={() => { setKind("") }} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                    <X />
                                </Button>
                            </div>
                        );
                    })}

                    {ControlRow(t("hasLink"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasLink}
                                onCheckedChange={(x) => { setHasLink(x as boolean) }}
                                className="border-[#ccc] w-8 h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                            />
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
                            onClick={handleSearch}
                            className="bg-[#ff8800] text-white hover:bg-[#ee3300]"
                        >
                            {t("ok")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
