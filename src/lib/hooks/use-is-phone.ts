import { useEffect, useState } from "react";

// Same test as the `phone` CSS variant: touch-driven with its short side under the sidebar breakpoint.
const PHONE_QUERY = "(pointer: coarse) and ((max-width: 767px) or (max-height: 767px))";
// Same test as the `phone-landscape` CSS variant.
const PHONE_LANDSCAPE_QUERY = "(pointer: coarse) and (max-height: 767px) and (orientation: landscape)";

// False until mounted, so the server and the first client render agree.
function useMatches(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);

        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}

export function useIsPhone(): boolean {
    return useMatches(PHONE_QUERY);
}

export function useIsPhoneLandscape(): boolean {
    return useMatches(PHONE_LANDSCAPE_QUERY);
}
