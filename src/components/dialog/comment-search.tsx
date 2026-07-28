"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { ControlRow } from "@/ui/control-row";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";
import { Checkbox } from "@/ui/checkbox";
import ComboBox from "@/ui/combo-box";
import { Button } from "@/ui/button";
import { X } from "lucide-react";
import { useVideoStore } from "@/stores/video-store";
import { fetcCommentUsers } from "@/lib/fetch-wrapper";
import CalendarPopover from "@/ui/calendar-popover";
import CalendarDateRadio from "@/ui/calendar-date-radio";
import { useCommentStore } from "@/stores/comment-store";


export function CommentSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("comment-search");
    const [commentUsers, setCommentUsers] = useState<{ label: string, value: string }[]>([]);
    const { selectedRevision, revisions } = useVideoStore();
    const { fetchComments } = useCommentStore();
    const {
        hasDrawing,
        hasIssue,
        fetchAllComments,
        user,
        filterText,

        setHasDrawing,
        setHasIssue,
        setFetchAllComments,
        setCommentUser,
        setFilterText,
    } = useCommentSearchStore();
    const dateFilter = useCommentSearchDateFilterStore();

    useEffect(() => {
        void (async () => {
            const users = await fetcCommentUsers({ videoId: selectedRevision?.videoId, hasDrawing });
            setCommentUsers(users.map((u) => ({ label: u.userName, value: u.userName })));
        })();
    }, [open]);

    const handleSearch = () => {
        if (selectedRevision) {
            fetchComments(selectedRevision);
        }
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={x => { onClose() }}>
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
                                    placeholder="Filter tree..."
                                />
                                <Button onClick={() => { dateFilter.clear() }} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                    <X />
                                </Button>
                            </div>
                        );
                    })}

                    {ControlRow(t("dateRange"), () => {
                        return (
                            <div className="flex justify-between">
                                <CalendarDateRadio
                                    mode={dateFilter.mode}
                                    range={dateFilter.mode === "range" && dateFilter.from && dateFilter.to
                                        ? { from: new Date(dateFilter.from), to: new Date(dateFilter.to) }
                                        : undefined}
                                    onToday={dateFilter.setToday}
                                    onRecent={dateFilter.setRecent}
                                    onSetRange={dateFilter.setRange}
                                    onClear={dateFilter.clear} />
                            </div>
                        );
                    })}

                    {ControlRow(t("hasDrawing"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasDrawing}
                                onCheckedChange={(x) => { setHasDrawing(x as boolean) }}
                                className="border-[#ccc] w-8  h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                            />
                        );
                    })}

                    {ControlRow(t("hasIssue"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasIssue}
                                onCheckedChange={(x) => { setHasIssue(x as boolean) }}
                                className="border-[#ccc] w-8  h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                            />
                        );
                    })}

                    {ControlRow(t("fetchAllComments"), () => {
                        return (
                            <Checkbox
                                defaultChecked={fetchAllComments}
                                onCheckedChange={(x) => { setFetchAllComments(x as boolean) }}
                                className="border-[#ccc] w-8  h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                            />
                        );
                    })}

                    {ControlRow(t("userFilter"), () => {
                        return (
                            <div className="flex justify-between">
                                <ComboBox
                                    options={commentUsers}
                                    setValue={setCommentUser}
                                    value={user}
                                    placeholder="Select user..."
                                    className="mx-2" />
                                <Button onClick={() => { setCommentUser(undefined) }} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                    <X />
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
