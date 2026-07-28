"use client";
import React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover } from '@radix-ui/react-popover';
import { PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Button } from '@/ui/button';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/ui/calendar';
import CalendarDateRadio from '@/ui/calendar-date-radio';

interface CalendarPopoverProps extends React.ComponentProps<"div"> {
    mode: "none" | "today" | "recent" | "range";
    range: DateRange | undefined;
    onToday: () => void;
    onRecent: (days: number) => void;
    onSetRange: (from: Date, to: Date) => void;
    onClear: () => void;
}

export default function CalendarPopover({
    mode,
    range,
    onToday,
    onRecent,
    onSetRange,
    onClear,
    className,
    ...props
}: CalendarPopoverProps) {
    const [open, setOpen] = React.useState(false);
    // Local working range so an in-progress selection (only "from" picked) stays
    // visible until both ends are chosen, then it is committed via onSetRange.
    const [draft, setDraft] = React.useState<DateRange | undefined>(range);

    const handleOpenChange = (next: boolean) => {
        // Re-seed the draft from the resolved range each time the popover opens.
        if (next) setDraft(range);
        setOpen(next);
    };

    const handleSelect = (selected: DateRange | undefined) => {
        setDraft(selected);
        if (selected?.from && selected?.to) onSetRange(selected.from, selected.to);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button className={`text-white bg-[#333] hover:bg-[#fff]`} size="sm" variant="outline">
                    <CalendarIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex items-center bg-[#1f1f1f] ">
                <div>
                    <div className="flex justify-between">
                        <CalendarDateRadio
                            mode={mode}
                            range={range}
                            onToday={onToday}
                            onRecent={onRecent}
                            onSetRange={onSetRange}
                            onClear={onClear}
                            collapseCalendarBtn />
                        <Button onClick={() => setOpen(false)} className="text-white bg-[#333] hover:bg-[#fff] hover:text-[#000]">
                            <X />
                        </Button>
                    </div>
                    <Calendar
                        mode="range"
                        defaultMonth={draft?.to ?? range?.to}
                        selected={draft}
                        onSelect={handleSelect}
                        numberOfMonths={1}
                        className='rounded-md  bg-[#1f1f1f] text-white'
                        classNames={{
                            range_start: 'bg-[#ff880055] dark:bg-[#ff880055] rounded-l-full',
                            range_end: 'bg-[#ff880055] dark:bg-[#ff880055] rounded-r-full',
                            day_button: [
                                // range selected
                                "data-[range-start=true]:rounded-full!",
                                "data-[range-start=true]:bg-[#ff8800]!",
                                "data-[range-start=true]:text-white!",

                                "data-[range-end=true]:rounded-full!",
                                "data-[range-end=true]:bg-[#ff8800]!",
                                "data-[range-end=true]:text-white!",

                                // range middle
                                "data-[range-middle=true]:rounded-none",
                                "data-[range-middle=true]:bg-[#ff880055]",
                                "data-[range-middle=true]:text-white!",

                                // hover
                                "hover:rounded-full",
                            ].join(" "),
                            today:
                                'data-[selected=true]:rounded-l-none! rounded-full bg-[#ee990077]!'
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
