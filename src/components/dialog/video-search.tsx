"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { fetcCommentUsers, fetchAllVideoTags } from "@/lib/fetch-wrapper";
import { ControlRow } from "@/ui/control-row";
import ComboBox from "@/ui/combo-box";
import { Checkbox } from "@/ui/checkbox";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { Button } from "@/ui/button";
import { useVideoStore } from "@/stores/video-store";
import { X } from "lucide-react";
import CalendarDateRadio from "@/ui/calendar-date-radio";
import MultiComboBox from "@/ui/multi-combobox";
import { Badge } from "@/ui/badge";

export function VideoSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("video-search");
    const { fetchVideos, allVideoTags } = useVideoStore();
    const [commentUsers, setCommentUsers] = useState<{ label: string, value: string }[]>([]);

    const {
        user,
        videoDateRange,
        commentsDateRange,
        filterIssue,
        filterTree,
        hasComment,
        hasIssue,
        hasDrawing,
        tags,

        setHasComment,
        setCommentUser,
        setHasDrawing,
        setHasIssue,
        setFilterIssue,
        setFilterTree,
        setVideoDateRange,
        setCommentsDateRange,
        setTags
    } = useVideoSearchStore();

    useEffect(() => {
        void (async () => {
            const users = await fetcCommentUsers({ hasDrawing });
            setCommentUsers(users.map((u) => ({ label: u.userName, value: u.userName })));
        })();
    }, [open]);

    const handleSearch = () => {
        fetchVideos();
        onClose();
    }

    const handleClearUserFilter = () => {
        setCommentUser(undefined);
        setCommentsDateRange(undefined);
    }

    const handleClearTreeFilter = () => {
        setVideoDateRange(undefined);
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
                                                className="mx-2" />
                                            <Button onClick={handleClearUserFilter} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                                <X />
                                            </Button>
                                        </div>
                                    );
                                })}

                                {ControlRow(t("commentsDateRange"), () => {
                                    return (
                                        <div className="flex justify-between">
                                            <CalendarDateRadio value={commentsDateRange} onSetValue={setCommentsDateRange} />
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
                                    className="border-[#ccc] w-full h-8 rounded bg-[#181818] border px-2 text-sm text-white mx-2"
                                    placeholder="Filter tree..."
                                />
                                <Button onClick={handleClearTreeFilter} variant="outline" className="border-[#ccc] bg-[#181818] border h-8.2">
                                    <X />
                                </Button>
                            </div>
                        );
                    })}

                    {ControlRow(t("videoDateRange"), () => {
                        return (
                            <div className="flex justify-between">
                                <CalendarDateRadio value={videoDateRange} onSetValue={setVideoDateRange} />
                            </div>
                        );
                    })}

                    {ControlRow("Tags", () => {
                        return (
                            <div className="mx-2 w-full">
                                <MultiComboBox
                                    placeholder="Select tags..."
                                    options={allVideoTags ?? []}
                                    value={tags}
                                    setValue={setTags}
                                />
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

