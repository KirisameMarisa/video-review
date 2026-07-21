export type Relevance = "high" | "maybe" | "unlikely";

export type VcsPullRequest = {
    id: string;
    title: string;
    description: string | null;
    author: string;
    mergedAt: string;
    url: string;
    labels: string[];
    changedFiles?: number;
    relevance: Relevance;
    relevanceReason: string;
};

export type VcsCommit = {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    committedAt: string;
    url: string | null;
    relevance: Relevance;
    relevanceReason: string;
};

export type VcsChangeSet = {
    pullRequests: VcsPullRequest[];
    commits: VcsCommit[];
    range: { from: string | null; to: string };
    fromCache: boolean;
    fetchedAt: string;
};
