import type { ChangeSet } from "@/server/lib/vcs/types";

export interface GetChangesParams {
    /** Start datetime (uploadedAt of the previous revision). If omitted, returns the latest N items before `to`. */
    from?: Date;
    /** End datetime (uploadedAt of this revision). */
    to: Date;
    branch?: string;
}

export interface VCSProvider {
    /** Repository identifier (for display). */
    readonly name: string;

    /** Fetch changes within the specified period. */
    getChanges(params: GetChangesParams): Promise<ChangeSet>;

    /**
     * Fetch the list of changed file paths for a given merge request id (PR/MR/Swarm Review etc.).
     * Used for relevance filtering (vcsWatchPaths × file path match).
     * Optional — providers that don't support this leave it undefined.
     */
    fetchMergeFiles?(mergeId: string): Promise<string[]>;

    /**
     * Fetch the list of changed file paths for a given commit hash.
     * Used for relevance filtering on commits.
     * Optional — providers that don't support this leave it undefined.
     */
    fetchCommitFiles?(hash: string): Promise<string[]>;
}
