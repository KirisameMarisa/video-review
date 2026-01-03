import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { fetcCommentUsers, fetchVideos } from "@/lib/fetch-wrapper";
import { ControlRow } from "@/ui/control-row";
import ComboBox from "@/ui/combo-box";
import { Checkbox } from "@/ui/checkbox";
import CalendarPopover from "@/ui/calendar-popover";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { Button } from "./ui/button";
import { useVideoStore } from "@/stores/video-store";
import { BrushCleaning } from "lucide-react";

export function VideoSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("video-search");
    const { fetchVideos } = useVideoStore();
    const [commentUsers, setCommentUsers] = useState<{ label: string, value: string }[]>([]);

    const {
        user,
        dateRange,
        filterIssue,
        filterTree,
        hasComment,
        hasIssue,
        hasDrawing,

        setHasComment,
        setCommentUser,
        setHasDrawing,
        setHasIssue,
        setFilterIssue,
        setFilterTree,
        setDateRange,
    } = useVideoSearchStore();

    useEffect(() => {
        (async () => {
            const users = await fetcCommentUsers({ hasDrawing });
            setCommentUsers(users.map((u) => ({ label: u.userName, value: u.userEmail })));
        })();
    }, [open]);

    const handleSearch = () => {
        fetchVideos();
        onClose();
    }

    const handleClearUserFilter = () => {
        setCommentUser(undefined);
        setDateRange(undefined);
    }

    const handleClearTreeFilter = () => {
        setDateRange(undefined);
    }

    return (
        <Dialog open={open} onOpenChange={x => onClose()}>
            <DialogContent className="bg-[#202020]">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 min-w-[360px]">

                    {ControlRow(t("hasComment"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasComment}
                                onCheckedChange={(x) => setHasComment(x as boolean)}
                                className="border-[#ccc] w-8  h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                            />
                        );
                    })}

                    {hasComment
                        ? (
                            <>
                                {ControlRow(t("userFilter"), () => {
                                    return (
                                        <div className="flex justify-between">
                                            <ComboBox
                                                options={commentUsers}
                                                setValue={setCommentUser}
                                                value={user}
                                                placeholder="Select user..."
                                                className="border-[#ccc] rounded bg-[#181818] border px-2 text-sm text-white" />
                                            <CalendarPopover
                                                className="border-[#ccc] bg-[#181818] border h-8.2 mx-2"
                                                value={dateRange}
                                                onSetValue={setDateRange} />
                                            <Button onClick={handleClearUserFilter} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                                <BrushCleaning />
                                            </Button>
                                        </div>
                                    );
                                })}

                                {ControlRow(t("hasIssue"), () => {
                                    return (
                                        <Checkbox
                                            defaultChecked={hasIssue}
                                            onCheckedChange={(x) => setHasIssue(x as boolean)}
                                            className="border-[#ccc] w-8  h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                                        />
                                    );
                                })}

                                {hasIssue ?
                                    (<>
                                        {ControlRow(t("filterIssue"), () => {
                                            return (
                                                <input
                                                    type="text"
                                                    value={filterIssue}
                                                    onChange={(e) => setFilterIssue(e.target.value)}
                                                    className="border-[#ccc] w-full h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                                                    placeholder="Filter..."
                                                />
                                            );
                                        })}
                                    </>) : (<></>)}

                                {ControlRow(t("hasDrawing"), () => {
                                    return (
                                        <Checkbox
                                            defaultChecked={hasDrawing}
                                            onCheckedChange={(x) => setHasDrawing(x as boolean)}
                                            className="border-[#ccc] w-8  h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                                        />
                                    );
                                })}
                            </>
                        )
                        : (<></>)
                    }

                    {ControlRow(t("searchFilter"), () => {
                        return (
                            <div className="flex justify-between">
                                <input
                                    type="text"
                                    value={filterTree}
                                    onChange={(e) => setFilterTree(e.target.value)}
                                    className="border-[#ccc] w-full h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                                    placeholder="Filter tree..."
                                />
                                <CalendarPopover
                                    className="border-[#ccc] bg-[#181818] border h-8.2 mx-2"
                                    value={dateRange}
                                    onSetValue={setDateRange} />
                                <Button onClick={handleClearTreeFilter} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                    <BrushCleaning />
                                </Button>
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


