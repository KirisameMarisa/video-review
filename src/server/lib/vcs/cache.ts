import { prisma } from "@/server/lib/db";
import type { VCSProvider } from "@/server/lib/vcs/provider";
import type { PullRequest, Commit } from "@/server/lib/vcs/types";

export function startOfUTCDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUTCDays(d: Date, n: number): Date {
    return new Date(d.getTime() + n * 86_400_000);
}

/** Returns UTC-midnight timestamps from startOfUTCDay(from) to startOfUTCDay(to), inclusive. */
export function listUTCDays(from: Date, to: Date): Date[] {
    const days: Date[] = [];
    let cur = startOfUTCDay(from);
    const end = startOfUTCDay(to);
    while (cur.getTime() <= end.getTime()) {
        days.push(cur);
        cur = addUTCDays(cur, 1);
    }
    return days;
}

const dayInFlight = new Map<string, Promise<void>>();

/**
 * Fetches any UTC days in [rangeFrom, rangeTo] not yet in VCSFetchedRange,
 * then upserts results into VCSCachedMerge / VCSCachedCommit.
 * Concurrent calls for the same day are deduplicated via dayInFlight.
 */
export async function ensureDaysCached(
    provider: VCSProvider,
    repoName: string,
    rangeFrom: Date,
    rangeTo: Date,
): Promise<void> {
    const days = listUTCDays(rangeFrom, rangeTo);

    const fetched = await prisma.vCSFetchedRange.findMany({
        where: { repoName, date: { in: days } },
        select: { date: true },
    });
    const fetchedSet = new Set(fetched.map(r => r.date.getTime()));

    const missing = days.filter(d => !fetchedSet.has(d.getTime()));
    if (missing.length === 0) return;

    await Promise.all(missing.map(day => fetchDay(provider, repoName, day)));
}

export async function queryByDateRange(repoName: string, rangeFrom: Date, rangeTo: Date) {
    const rangeEnd = addUTCDays(startOfUTCDay(rangeTo), 1); // exclusive upper bound

    const [merges, commits] = await Promise.all([
        prisma.vCSCachedMerge.findMany({
            where: { repoName, mergedAt: { gte: rangeFrom, lt: rangeEnd } },
        }),
        prisma.vCSCachedCommit.findMany({
            where: { repoName, committedAt: { gte: rangeFrom, lt: rangeEnd } },
        }),
    ]);

    return { merges, commits };
}

async function fetchDay(provider: VCSProvider, repoName: string, day: Date): Promise<void> {
    const key = `${repoName}:${day.toISOString()}`;

    const inflight = dayInFlight.get(key);
    if (inflight) {
        await inflight;
        return;
    }

    let resolve!: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    dayInFlight.set(key, promise);

    try {
        const dayEnd = addUTCDays(day, 1);
        const changeSet = await provider.getChanges({ from: day, to: dayEnd });

        await Promise.all([
            ...changeSet.pullRequests.map(pr => upsertMerge(provider, repoName, pr)),
            ...changeSet.commits.map(commit => upsertCommit(provider, repoName, commit)),
        ]);

        await prisma.vCSFetchedRange.upsert({
            where: { repoName_date: { repoName, date: day } },
            create: { repoName, date: day },
            update: { fetchedAt: new Date() },
        });
    } finally {
        resolve();
        dayInFlight.delete(key);
    }
}

export async function upsertMerge(provider: VCSProvider, repoName: string, pr: PullRequest) {
    const existing = await prisma.vCSCachedMerge.findUnique({
        where: { externalId_repoName: { externalId: pr.id, repoName } },
    });

    const alreadyCached = existing?.filesFetchedAt != null;
    const files = alreadyCached
        ? existing!.files
        : (provider.fetchMergeFiles ? await provider.fetchMergeFiles(pr.id) : []);
    const filesFetchedAt = alreadyCached ? existing!.filesFetchedAt : new Date();

    await prisma.vCSCachedMerge.upsert({
        where: { externalId_repoName: { externalId: pr.id, repoName } },
        create: {
            externalId: pr.id, repoName, title: pr.title, description: pr.description,
            author: pr.author, mergedAt: pr.mergedAt, url: pr.url, labels: pr.labels,
            files, filesFetchedAt,
        },
        update: {
            title: pr.title, description: pr.description, author: pr.author,
            mergedAt: pr.mergedAt, url: pr.url, labels: pr.labels,
            ...(!alreadyCached ? { files, filesFetchedAt } : {}),
        },
    });
}

export async function upsertCommit(provider: VCSProvider, repoName: string, commit: Commit) {
    const existing = await prisma.vCSCachedCommit.findUnique({
        where: { hash_repoName: { hash: commit.hash, repoName } },
    });

    const alreadyCached = existing?.filesFetchedAt != null;
    const files = alreadyCached
        ? existing!.files
        : (provider.fetchCommitFiles ? await provider.fetchCommitFiles(commit.hash) : []);
    const filesFetchedAt = alreadyCached ? existing!.filesFetchedAt : new Date();

    await prisma.vCSCachedCommit.upsert({
        where: { hash_repoName: { hash: commit.hash, repoName } },
        create: {
            hash: commit.hash, repoName, shortHash: commit.shortHash, message: commit.message,
            author: commit.author, committedAt: commit.committedAt, url: commit.url,
            files, filesFetchedAt,
        },
        update: {
            message: commit.message, author: commit.author, committedAt: commit.committedAt,
            url: commit.url,
            ...(!alreadyCached ? { files, filesFetchedAt } : {}),
        },
    });
}
