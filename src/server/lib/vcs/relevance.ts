import type { Relevance } from "@/server/lib/vcs/types";

/**
 * Returns true if `filePath` matches any entry in `vcsWatchPaths`.
 *
 * Match rules (per design):
 *   - Entry ending with "/" → directory-like match
 *   - Otherwise             → file-like match
 *
 * To absorb repo-root differences, matching is done with path-segment-aware, bi-directional partial checks.
 */
export function matchesWatchPaths(filePath: string, vcsWatchPaths: string[]): boolean {
    const normalizePath = (value: string): string =>
        value
            .replace(/\\/g, "/")
            .replace(/^\.?\//, "")
            .replace(/\/+/g, "/")
            .replace(/\/$/, "");

    const containsBySegment = (a: string, b: string): boolean => {
        if (a === b) return true;
        if (a.startsWith(`${b}/`)) return true;
        if (a.endsWith(`/${b}`)) return true;
        if (a.includes(`/${b}/`)) return true;
        return false;
    };

    const file = normalizePath(filePath);
    for (const watchPath of vcsWatchPaths) {
        const watch = normalizePath(watchPath);
        if (containsBySegment(file, watch) || containsBySegment(watch, file)) return true;
    }
    return false;
}

export type RelevanceResult = { relevance: Relevance; relevanceReason: string };

/**
 * Score relevance based solely on vcsWatchPaths × file path match.
 *
 * Strategy:
 *   - vcsWatchPaths empty → "high" (no filter configured)
 *   - files match vcsWatchPaths → "high"
 *   - no match → "unlikely"
 *
 * File paths are expected to come from DB cache (VCSCachedMerge.files / VCSCachedCommit.files).
 * No per-item API fetch is performed here.
 */
export function scoreRelevance(
    files: string[],
    vcsWatchPaths: string[],
): RelevanceResult {
    if (vcsWatchPaths.length === 0) {
        return { relevance: "high", relevanceReason: "no filter configured" };
    }

    const matched = files.find(f => matchesWatchPaths(f, vcsWatchPaths));
    if (matched) {
        return { relevance: "high", relevanceReason: `vcsWatchPaths match: ${matched}` };
    }

    return { relevance: "unlikely", relevanceReason: "no vcsWatchPaths match" };
}
