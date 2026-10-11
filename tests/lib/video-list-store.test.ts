import { beforeEach, describe, expect, it } from "vitest";
import { useVideoListStore } from "@/stores/video-list-store";

const at = (day: number, hour: number) => new Date(2026, 9, day, hour);

describe("recordVisit", () => {
    beforeEach(() => {
        useVideoListStore.setState({ visitDay: null, firstVisitAt: null, previousVisitAt: null });
    });

    it("has no previous visit on the first day", () => {
        useVideoListStore.getState().recordVisit(at(5, 9));

        expect(useVideoListStore.getState().previousVisitAt).toBeNull();
    });

    it("takes the earlier day's first visit, not its last, so late uploads that day still count as new", () => {
        const { recordVisit } = useVideoListStore.getState();
        recordVisit(at(5, 9));
        recordVisit(at(5, 18));
        recordVisit(at(6, 10));

        expect(useVideoListStore.getState().previousVisitAt).toBe(at(5, 9).getTime());
    });

    it("keeps the previous visit when the list is reopened later the same day", () => {
        const { recordVisit } = useVideoListStore.getState();
        recordVisit(at(5, 9));
        recordVisit(at(6, 10));
        recordVisit(at(6, 15));

        expect(useVideoListStore.getState().previousVisitAt).toBe(at(5, 9).getTime());
    });
});
