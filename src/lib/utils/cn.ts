import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge reads an unknown text-* class as a text colour and drops one of the two.
// The text roles from globals.css get their own group, so they only replace each other.
const twMerge = extendTailwindMerge<"text-role">({
    extend: {
        classGroups: {
            "text-role": ["text-trailing", "text-supporting"],
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
