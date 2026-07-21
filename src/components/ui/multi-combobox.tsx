import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface MultiComboBoxProps {
    label?: string;
    options: string[];
    value: string[];
    setValue: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function MultiComboBox({
    label,
    options,
    value,
    setValue,
    placeholder = "Select...",
    disabled = false,
}: MultiComboBoxProps) {
    const toggleValue = (item: string) => {
        if (value.includes(item)) {
            setValue(value.filter((v) => v !== item));
        } else {
            setValue([...value, item]);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className="text-sm text-[#ccc]">
                    {label}
                </label>
            )}

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className="justify-between bg-[#202020] border-[#333] text-white hover:bg-[#202020] hover:border-[#ff8800]"
                    >
                        <div className="flex gap-1 flex-wrap">
                            {value.length === 0 && (
                                <span className="text-[#888]">
                                    {placeholder}
                                </span>
                            )}
                            {value.map((v) => (
                                <Badge
                                    key={v}
                                    variant="outline"
                                    className="border-[#333] bg-[#202020] text-[#eee]"
                                >
                                    {v}
                                </Badge>
                            ))}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-60 bg-[#202020] border-[#333] text-white">
                    <Command className="bg-[#202020] text-white">
                        <CommandInput placeholder="Search..." />
                        <CommandEmpty>No options found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    onSelect={() => toggleValue(option)}
                                    className="text-[#fff] data-[selected=true]:bg-[#eee] data-[selected=true]:text-[#222]"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            "text-white",
                                            value.includes(option)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
