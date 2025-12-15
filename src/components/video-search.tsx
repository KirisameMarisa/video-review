import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/ui/calendar";
import { Switch } from "@/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { useTranslations } from "next-intl";

export type EDateSearchMode = "dateFilterOff" | "dateRange";

export type VideoFilterParam = {
    searchMode: EDateSearchMode | undefined;
    dateRange: DateRange | undefined;
    filterText: string;
}

export function VideoSearchPopover({
    videoFilterParam,
    updateVideoFilter
}: {
    videoFilterParam: VideoFilterParam | undefined,
    updateVideoFilter: (param: VideoFilterParam) => void;
}) {
    const t = useTranslations("video-search");
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [searchMode, setSearchMode] = useState<EDateSearchMode | undefined>(undefined);
    const [filterText, setFilterText] = useState<string>("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    useEffect(() => {
        applyParam();
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 7);
        setDateRange({ from, to });

        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                setOpen(x => !x);
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
        if (videoFilterParam) {
            setSearchMode(videoFilterParam.searchMode);
            setFilterText(videoFilterParam.filterText);
            setDateRange(videoFilterParam.dateRange);
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (open) {
            applyParam();
        }
        setOpen(open);
    };

    useEffect(() => {
        updateVideoFilter({
            searchMode,
            filterText,
            dateRange
        });
    }, [searchMode, filterText, dateRange]);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="relative">
                    <FontAwesomeIcon icon={faGear} className="text-[#ff8800]" />

                    <span className="
                        -bottom-1.5 absolute  -right-5 text-[9px] -px-1 py-2 rounded bg-[#00000000] text-gray-300 pointer-events-none">
                        {t("shortcutKey")}
                    </span>
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-full bg-[#1f1f1f] border border-[#333] text-white">
                <div className="flex items-center space-x-3 py-2">
                    <Switch
                        className="border-white"
                        checked={searchMode === "dateRange"}
                        onCheckedChange={(x) =>
                            setSearchMode(x ? "dateRange" : "dateFilterOff")
                        }
                    />
                    <span className="text-sm text-gray-100">
                        {searchMode ? t(searchMode) : ""}
                    </span>
                </div>


                {searchMode === "dateRange" ? (
                    <div className="flex items-center space-x-3">
                        <Calendar
                            mode="range"
                            defaultMonth={dateRange?.to}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            className='rounded-md border'
                            classNames={{
                                range_start: 'bg-[#ff880055] dark:bg-[#ff880055] rounded-l-full',
                                range_end: 'bg-[#ff880055] dark:bg-[#ff880055] rounded-r-full',
                                day_button: [
                                    // 選択状態
                                    "data-[range-start=true]:rounded-full!",
                                    "data-[range-start=true]:bg-[#ff8800]!",
                                    "data-[range-start=true]:text-white!",

                                    "data-[range-end=true]:rounded-full!",
                                    "data-[range-end=true]:bg-[#ff8800]!",
                                    "data-[range-end=true]:text-white!",

                                    // 中間の範囲
                                    "data-[range-middle=true]:rounded-none",
                                    "data-[range-middle=true]:bg-[#ff880055]",
                                    "data-[range-middle=true]:text-white!",

                                    // hover 時（全体の丸み補正）
                                    "hover:rounded-full",
                                ].join(" "),
                                today:
                                    'data-[selected=true]:rounded-l-none! rounded-full bg-[#ee990077]!'
                            }}
                        />
                    </div>
                ) : <></>}

                <div className="flex flex-col mt-3">
                    <span className="text-xs text-gray-400 mb-0.5">{t("searchFilter")}</span>
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
