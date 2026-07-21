import { VideoEventWithKind } from "@/lib/db-types";

export async function fetchVideoEvents(data: {
    videoId: string;
    selectRevision: number;
    filterText?: string;
    kind?: string;
    hasLink?: boolean;
}): Promise<VideoEventWithKind[]> {
    const params = new URLSearchParams();
    params.set("selectRevision", data.selectRevision.toString());
    if (data.filterText) params.set("filterText", data.filterText);
    if (data.kind) params.set("kind", data.kind);
    if (data.hasLink) params.set("hasLink", "true");

    const res = await fetch(`/api/v1/videos/${data.videoId}/events?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
}

export async function fetchVideoEventKinds(): Promise<string[]> {
    const res = await fetch("/api/v1/videos/event-kinds");
    if (!res.ok) throw new Error("Failed to fetch event kinds");
    const json = await res.json();
    return json.items;
}
