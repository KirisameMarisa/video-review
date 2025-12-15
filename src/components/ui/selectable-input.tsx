"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

export function SelectableInput({
    label,
    placeholder,
    options,
    selected,
    onSelect,
}: {
    label: string;
    placeholder: string,
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
}) {
    const [customValue, setCustomValue] = useState(selected);

    return (
        <div className="space-y-2">
            <label className="text-sm text-[#ccc]">{label}</label>

            {/* 既存の候補から選択 */}
            <Select
                value={options.includes(selected) ? selected : ""}
                onValueChange={(v) => onSelect(v)}
            >
                <SelectTrigger className="bg-[#202020] border-[#333] text-white">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] text-white">
                    {options.map((key) => (
                        <SelectItem key={key} value={key}>
                            {key}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* 候補にない場合、直接入力 */}
            <Input
                placeholder={placeholder}
                value={customValue}
                onChange={(e) => {
                    setCustomValue(e.target.value);
                    onSelect(e.target.value);
                }}
                className="bg-[#303030] border-[#444] text-white"
            />
        </div>
    );
}
