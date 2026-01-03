"use client";
import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover } from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/command';
import { PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/ui/calendar';

interface CalendarPopoverProps extends React.ComponentProps<"div"> {
    value: DateRange | undefined;
    onSetValue: (x: DateRange | undefined) => void;
}

export default function CalendarPopover({
    value,
    onSetValue,
    className,
    ...props
}: CalendarPopoverProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button className={`${className}`} variant="outline">
                    <CalendarIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex items-center bg-[#1f1f1f] ">
                <Calendar
                    mode="range"
                    defaultMonth={value?.to}
                    selected={value}
                    onSelect={onSetValue}
                    numberOfMonths={1}
                    className='rounded-md  bg-[#1f1f1f] text-white'
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
            </PopoverContent>
        </Popover>
    );
}
