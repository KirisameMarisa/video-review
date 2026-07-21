import type { VcsCommit } from "@/lib/vcs-types";

function formatDate(date: Date | string): string {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CommitCard({ commit }: { commit: VcsCommit }) {
    const borderClass =
        commit.relevance === "high"
            ? "border-l-2 border-l-[#ff8800]"
            : commit.relevance === "maybe"
              ? "border-l-2 border-l-[#555]"
              : "";

    return (
        <div
            className={`bg-[#222] border border-[#333] rounded px-3 py-2 flex flex-col gap-1 min-w-0 ${borderClass} ${commit.relevance === "unlikely" ? "opacity-60" : ""}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className="text-sm text-[#eee] truncate flex-1 min-w-0"
                    title={commit.message}
                >
                    <span className="text-[#ff8800] font-mono text-xs mr-1">{commit.shortHash}</span>
                    {commit.message}
                </span>
                {commit.url && (
                    <a
                        href={commit.url}
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
                @{commit.author} · {formatDate(commit.committedAt)}
            </div>
        </div>
    );
}
