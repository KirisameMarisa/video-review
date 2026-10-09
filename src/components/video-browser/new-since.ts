const VISITS_KEY = "videoListVisits";

type Visits = {
    day: string;
    firstOpenedAt: string;
    previousFirstOpenedAt: string | null;
};

// "New" means uploaded after this browser first opened the list on an earlier day, so last
// night's CI upload still counts the next morning and Friday's still counts on Monday.
// The first day has nothing to compare against, so nothing is new yet.
export function loadNewSince(now = new Date()): Date | null {
    try {
        const today = now.toDateString();
        const stored = JSON.parse(localStorage.getItem(VISITS_KEY) ?? "null") as Visits | null;
        let visits = stored;

        if (stored?.day !== today) {
            visits = { day: today, firstOpenedAt: now.toISOString(), previousFirstOpenedAt: stored?.firstOpenedAt ?? null };
            localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
        }

        return visits?.previousFirstOpenedAt ? new Date(visits.previousFirstOpenedAt) : null;
    } catch {
        // Without storage there is no earlier visit to compare against.
        return null;
    }
}
