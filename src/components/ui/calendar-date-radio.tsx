"use client";
import React from 'react';
import { Button } from '@/ui/button';
import { ButtonGroup } from '@/ui/button-group';
import { DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import CalendarPopover from '@/ui/calendar-popover';
import { X } from 'lucide-react';

// Prop-driven and store-agnostic: the current mode drives the active highlight,
// `range` feeds the popover calendar, and each control reports intent via a
// callback so any date-filter store can back it.
interface CalendarDateRadioProps extends React.ComponentProps<"div"> {
    mode: "none" | "today" | "recent" | "range";
    range: DateRange | undefined;
    onToday: () => void;
    onRecent: (days: number) => void;
    onSetRange: (from: Date, to: Date) => void;
    onClear: () => void;
    collapseCalendarBtn?: boolean;
}

export default function CalendarDateRadio({
    mode,
    range,
    onToday,
    onRecent,
    onSetRange,
    onClear,
    collapseCalendarBtn = false,
    className,
    ...props
}: CalendarDateRadioProps) {
    const t = useTranslations("calendar-date-radio");
    const recentDay: number = 3;

    return (
        <div className={`${className}`}>
            <ButtonGroup>
                <Button
                    className={`text-white bg-[#333] hover:bg-[#fff] ${mode === "today" ? "bg-[#32cd32]" : ""}`}
                    variant="outline" size="sm"
                    onClick={onToday}>
                    {t("today")}
                </Button>
                <Button
                    className={`text-white bg-[#333] hover:bg-[#fff] ${mode === "recent" ? "bg-[#32cd32]" : ""}`}
                    variant="outline" size="sm"
                    onClick={() => onRecent(recentDay)}>
                    {t("recent", { days: recentDay })}
                </Button>
                {!collapseCalendarBtn && <>
                    <CalendarPopover
                        className="border-[#ccc] bg-[#181818] border h-8.2 mx-2"
                        mode={mode}
                        range={range}
                        onToday={onToday}
                        onRecent={onRecent}
                        onSetRange={onSetRange}
                        onClear={onClear} />
                </>}
                <Button
                    className={`text-white bg-[#333] hover:bg-[#fff]`}
                    variant="outline" size="sm" onClick={onClear}>
                    <X />
                </Button>
            </ButtonGroup>
        </div>
    );
}
