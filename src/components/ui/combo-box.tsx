"use client";

import clsx from 'clsx';
import React from 'react';
import Select, { components, MenuPlacement } from 'react-select';

interface ComboBoxProps {
    label: string;
    options: string[];
    value: string;
    setValue: (value: string) => void;
    require?: boolean;
    menuPlacement?: MenuPlacement;
}

export default function ComboBox({
    label,
    options,
    value,
    setValue,
    require = false,
    menuPlacement = 'bottom',
}: ComboBoxProps) {
    const selectOptions = options.map((opt) => ({ label: opt, value: opt }));
    const selectedOption = selectOptions.find((opt) => opt.value === value) || null;

    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-300">{label}</label>
            <Select
                options={selectOptions}
                value={selectedOption}
                onChange={(selected) => {
                    if (selected) setValue(selected.value);
                }}
                className={clsx(
                    "text-sm",
                    require && "border border-red-500"
                )}
                classNamePrefix="react-select"
                styles={{
                    control: (base) => ({
                        ...base,
                        backgroundColor: '#27272a',
                        borderColor: '#3f3f46',
                        color: 'white',
                    }),
                    singleValue: (base) => ({
                        ...base,
                        color: 'white',
                    }),
                    input: (base) => ({
                        ...base,
                        color: 'white',
                    }),
                    menu: (base) => ({
                        ...base,
                        backgroundColor: '#27272a',
                        zIndex: 100,
                    }),
                    option: (base, { isFocused, isSelected }) => ({
                        ...base,
                        backgroundColor: isSelected
                            ? '#3b82f6'
                            : isFocused
                            ? '#52525b'
                            : undefined,
                        color: isSelected ? 'white' : 'white',
                    }),
                }}
                menuPlacement={menuPlacement}
                isSearchable={true}
            />
        </div>
    );
}
