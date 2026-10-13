import { useEffect, useState } from "react";

// Same test as the `phone` CSS variant: touch-driven with its short side under the sidebar breakpoint.
const PHONE_QUERY = "(pointer: coarse) and ((max-width: 767px) or (max-height: 767px))";

// False until mounted, so the server and the first client render agree.
export function useIsPhone(): boolean {
    const [isPhone, setIsPhone] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(PHONE_QUERY);
        const onChange = () => setIsPhone(mql.matches);

        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return isPhone;
}
