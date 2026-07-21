import type { VcsPullRequest } from "@/lib/vcs-types";

function formatDate(date: Date | string): string {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MAX_LABELS = 5;

export function PrCard({ pr }: { pr: VcsPullRequest }) {
    const borderClass =
        pr.relevance === "high"
            ? "border-l-2 border-l-[#ff8800]"
            : pr.relevance === "maybe"
              ? "border-l-2 border-l-[#555]"
              : "";

    const visibleLabels = pr.labels.slice(0, MAX_LABELS);
    const hiddenCount = pr.labels.length - MAX_LABELS;

    return (
        <div
            className={`bg-[#222] border border-[#333] rounded px-3 py-2 flex flex-col gap-1 min-w-0 ${borderClass} ${pr.relevance === "unlikely" ? "opacity-60" : ""}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className="text-sm text-[#eee] truncate flex-1 min-w-0"
                    title={pr.title}
                >
                    <span className="text-[#ff8800] font-mono text-xs mr-1">#{pr.id}</span>
                    {pr.title}
                </span>
                {pr.url && (
                    <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#555] hover:text-[#ff8800] text-xs shrink-0"
                        title="GitHubで開く"
                    >
                        ↗
                    </a>
                )}
            </div>
            <div className="text-xs text-[#888]">
                @{pr.author} · {formatDate(pr.mergedAt)}
            </div>
            {pr.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {visibleLabels.map((label) => (
                        <span
                            key={label}
                            className="bg-[#2f2f2f] text-[#aaa] border border-[#444] rounded px-1.5 py-0 text-xs leading-5"
                        >
                            {label}
                        </span>
                    ))}
                    {hiddenCount > 0 && (
                        <span className="text-[#666] text-xs leading-5">+{hiddenCount}</span>
                    )}
                </div>
            )}
        </div>
    );
}
