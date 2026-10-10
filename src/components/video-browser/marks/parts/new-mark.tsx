import type { Mark } from "@/components/video-browser/marks/marks";

export const newMark: Mark = {
    key: "new",
    // Counted from the previous visit rather than from midnight, so uploads made late at night still show as new.
    isShown: (video, { previousVisitAt }) => {
        const uploadedAt = video.latestRevision?.uploadedAt;
        return previousVisitAt !== null && !!uploadedAt && new Date(uploadedAt).getTime() > previousVisitAt;
    },
    render: () => <NewBadge />,
};

function NewBadge() {
    return (
        <span className="text-3xs px-1 py-px bg-destructive text-foreground rounded leading-none">
            NEW
        </span>
    );
}
