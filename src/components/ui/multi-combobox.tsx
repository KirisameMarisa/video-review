'use client';

import React from 'react';
import Select from 'react-select';

interface MultiComboBoxProps {
    label: string;
    options: string[];
    value: string[];
    setValue: (value: string[]) => void;
}

export default function MultiComboBox({
    label,
    options,
    value,
    setValue,
}: MultiComboBoxProps) {
    const selectOptions = options.map((v) => ({ value: v, label: v }));
    const selectedOptions = selectOptions.filter((opt) => value.includes(opt.value));

    return (
        <div className="flex flex-col mb-2">
            <Select
                placeholder={label}
                isMulti
                value={selectedOptions}
                onChange={(selected) =>
                    setValue(selected.map((s) => s.value))
                }
                options={selectOptions}
                className="text-sm z-30"
                styles={{
                    control: (base) => ({
                        ...base,
                        backgroundColor: '#27272a',
                        borderColor: '#52525b',
                        color: 'white',
                    }),
                    multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#3f3f46',
                        color: 'white',
                    }),
                    multiValueLabel: (base) => ({
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
                        color: 'white',
                    }),
                    option: (base, { isFocused }) => ({
                        ...base,
                        backgroundColor: isFocused ? '#3f3f46' : '#27272a',
                        color: 'white',
                    }),
                }}
            />
        </div>
    );
}
