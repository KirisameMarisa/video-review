// Whether the user is on a Mac, for shortcuts that follow the conventions of the user's OS.
export function isMac(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
        ?? navigator.platform;

    return /mac/i.test(platform);
}
