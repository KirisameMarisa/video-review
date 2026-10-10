import { useRef, useState, type MouseEvent } from "react";
import { isMac } from "@/lib/platform";

// Whether a click picks rather than opens or replaces the selection: Shift for a range, and ⌘ on
// a Mac, where Ctrl+click is a right click, or Ctrl elsewhere, to add one.
export const isPickClick = (e: MouseEvent) => e.shiftKey || (isMac() ? e.metaKey : e.ctrlKey);

// Rows and folders picked for moving, by key, as in Explorer and Finder. `order` is every key in
// the order they are shown, which a Shift range is taken from.
export function useSelection(order: string[]) {
    const [selected, setSelected] = useState<string[]>([]);
    // Where a Shift range starts: the last row clicked without Shift.
    const anchor = useRef<string | null>(null);

    const click = (key: string, e: MouseEvent) => {
        if (e.shiftKey && anchor.current !== null && order.includes(anchor.current)) {
            const from = order.indexOf(anchor.current);
            const to = order.indexOf(key);
            setSelected(order.slice(Math.min(from, to), Math.max(from, to) + 1));
            return;
        }

        anchor.current = key;
        if (isPickClick(e)) {
            setSelected((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
        } else {
            setSelected([key]);
        }
    };

    const clear = () => {
        anchor.current = null;
        setSelected([]);
    };

    return { selected, click, clear };
}
