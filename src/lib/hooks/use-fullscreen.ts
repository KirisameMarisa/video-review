import { useEffect, useState, type RefObject } from "react";

// Fullscreen for one element. The state comes from fullscreenchange, so Esc and the button both
// update it; the browser's own F11 fullscreen fires no event and is not tracked.
export function useFullscreen(target: RefObject<HTMLElement | null>) {
    const [active, setActive] = useState(false);

    useEffect(() => {
        const sync = () => setActive(document.fullscreenElement === target.current && target.current !== null);
        // The button remounts while the next video loads, with the player still fullscreen.
        sync();
        document.addEventListener("fullscreenchange", sync);
        return () => document.removeEventListener("fullscreenchange", sync);
    }, [target]);

    const toggle = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void target.current?.requestFullscreen();
        }
    };

    return { active, toggle };
}
