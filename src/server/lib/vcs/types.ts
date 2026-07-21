export type Relevance = "high" | "maybe" | "unlikely";

export type ChangeSet = {
    pullRequests: PullRequest[];
    commits: Commit[];
    range: { from: Date | null; to: Date };
};

export type PullRequest = {
    id: string;
    title: string;
    description: string | null;
    author: string;
    mergedAt: Date;
    url: string;
    labels: string[];
    changedFiles?: number;
    relevance: Relevance;
    relevanceReason: string;
};

export type Commit = {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    committedAt: Date;
    url: string | null;
    relevance: Relevance;
    relevanceReason: string;
};
