"use client";
import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover } from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/command';
import { PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

interface ComboBoxProps extends React.ComponentProps<"div"> {
    options: { value: string, label: string }[];
    placeholder?: string;
    value: string | undefined;
    setValue: (value: string) => void;
}

export default function ComboBox({
    options,
    value,
    setValue,
    placeholder,
    className,
    ...props
}: ComboBoxProps) {
    const [open, setOpen] = React.useState(false);

    if (!options) return <> </>

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button className={`${className} text-[#ddd]`} variant="outline" role="combobox" aria-expanded={open} >
                    {value
                        ? options.find((option) => option.value === value)?.label
                        : placeholder ?? ""}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border-[#222]">
                <Command className={`${className} text-[#999]`}>
                    <CommandInput placeholder={placeholder ?? ""} className='mb-0.5' />
                    <CommandList >
                        <CommandEmpty>Not found.</CommandEmpty>
                        <CommandGroup >
                            {options.map((option) => (
                                <CommandItem
                                    className={`${className} text-[#999]`}
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    {option.label}
                                    <Check
                                        className={cn("text-[#fff]", "ml-auto", value === option.value ? "opacity-100" : "opacity-0")}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
