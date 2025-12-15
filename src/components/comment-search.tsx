import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { Switch } from "@/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type EFetchMode = "fetchAll" | "fetchRange";

export type CommentFilterParam = {
    fetchMode: EFetchMode | undefined;
    revRange: { revFrom: number; revTo: number };
    filterText: string;
};

export function CommentSearchPopover({
    revisions,
    commentFilterParam,
    updateCommentFilter,
}: {
    revisions: number[];
    commentFilterParam: CommentFilterParam | undefined;
    updateCommentFilter: (param: CommentFilterParam) => void;
}) {
    const t = useTranslations("comment-search");
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [filterText, setFilterText] = useState<string>("");
    const [fetchMode, setFetchMode] = useState<EFetchMode | undefined>(
        undefined,
    );
    const [revFrom, setRevFrom] = useState<number>(1);
    const [revTo, setRevTo] = useState<number>(1);

    const fromRevisions = revisions;
    const toRevisions = useMemo(() => {
        const r: number[] = [];
        if (revisions.length === 1) {
            r.push(revisions[0]);
            return r;
        }
        for (const rev of revisions) {
            if (revFrom < rev) {
                r.push(rev);
            }
        }
        return r;
    }, [revFrom, revisions]);

    useEffect(() => {
        applyParam();
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "i") {
                setOpen((x) => !x);
                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            }
            if (e.key === "Enter") {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const applyParam = () => {
        if (commentFilterParam) {
            setFetchMode(commentFilterParam.fetchMode);
            setRevFrom(commentFilterParam.revRange.revFrom);
            setRevTo(commentFilterParam.revRange.revTo);
            setFilterText(commentFilterParam.filterText);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (open) {
            applyParam();
        }
        setOpen(open);
    };

    useEffect(() => {
        updateCommentFilter({
            fetchMode,
            filterText,
            revRange: { revTo, revFrom },
        });
    }, [filterText, revFrom, revTo, fetchMode]);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="relative">
                    <FontAwesomeIcon icon={faGear} className="text-[#ff8800]" />

                    <span
                        className="
                        -bottom-1.5 absolute -right-5 text-[9px] -px-1 py-2 rounded bg-[#00000000] text-gray-300 pointer-events-none"
                    >
                        {t("shortcutKey")}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full bg-[#1f1f1f] border border-[#333] text-white">
                {/* 左側：切り替え */}
                <div className="flex items-center space-x-3 py-2">
                    <Switch
                        className="border-white"
                        checked={fetchMode === "fetchRange"}
                        onCheckedChange={(x) =>
                            setFetchMode(x ? "fetchRange" : "fetchAll")
                        }
                    />
                    <span className="text-sm text-gray-100">
                        {fetchMode ? t(fetchMode) : ""}
                    </span>
                </div>

                {/* 右側：Range時のUI（高さ固定化） */}
                <div className="flex items-center space-x-3">
                    {fetchMode === "fetchRange" ? (
                        <>
                            {/* From */}
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 mb-0.3">
                                    From
                                </span>
                                <Select
                                    value={revFrom.toString()}
                                    onValueChange={(val) => {
                                        setRevFrom(parseInt(val));
                                    }}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        className="w-30 h-8 bg-[#181818] text-white border-[#ccc]"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#181818] text-white border-[#ccc]">
                                        {fromRevisions.map((r) => (
                                            <SelectItem
                                                key={r}
                                                value={r.toString()}
                                            >
                                                Rev:{r}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg text-gray-300 -mb-3">
                                    ~
                                </span>
                            </div>
                            {/* To */}
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 mb-0.3">
                                    To
                                </span>
                                <Select
                                    value={revTo.toString()}
                                    onValueChange={(val) => {
                                        setRevTo(parseInt(val));
                                    }}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        className="w-30 h-8 bg-[#181818] text-white border-[#ccc]"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#181818] text-white border-[#ccc]">
                                        {toRevisions.map((r) => (
                                            <SelectItem
                                                key={r}
                                                value={r.toString()}
                                            >
                                                Rev:{r}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    ) : (
                        <div className="w-68.5 opacity-0 pointer-events-none flex items-center  " />
                    )}
                </div>

                <div className="flex flex-col mt-3">
                    <span className="text-xs text-gray-400 mb-0.5">
                        {t("searchFilter")}
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="border-[#ccc] w-full h-8 rounded bg-[#181818] border px-2 text-sm text-white"
                        placeholder=""
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
