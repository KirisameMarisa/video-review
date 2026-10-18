import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import {
    EVAL_FOLDER_PREFIX,
    EVAL_REPO_NAME,
    EVAL_USERS,
    EVAL_VIDEOS,
    type EvalRevision,
    type EvalVideo,
} from "./eval-data";

// Seeds the eval dataset from prisma/eval-data.ts into the database in DATABASE_URL.
// Safe to re-run: only the `eval/` folder subtree and the eval repo cache are replaced.

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function upsertUsers(): Promise<Map<string, User>> {
    const byName = new Map<string, User>();
    for (const u of EVAL_USERS) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                id: randomUUID(),
                email: u.email,
                displayName: u.displayName,
                avatarPath: u.avatarPath,
                role: u.role,
                identities: {
                    create: {
                        id: randomUUID(),
                        provider: "password",
                        providerUid: u.email,
                        secretHash: await bcrypt.hash(u.pass, 10),
                    },
                },
            },
        });
        byName.set(u.displayName, user);
    }
    return byName;
}

async function upsertEventKinds(labels: string[]): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const label of labels) {
        const kind = await prisma.videoEventKind.upsert({
            where: { label },
            update: {},
            create: { id: randomUUID(), label },
        });
        ids.set(label, kind.id);
    }
    return ids;
}

async function ensureVcsConfig(): Promise<string> {
    const existing = await prisma.vCSConfig.findFirst({ where: { label: EVAL_REPO_NAME } });
    if (existing) return existing.id;
    const created = await prisma.vCSConfig.create({
        data: { label: EVAL_REPO_NAME, provider: "github", config: {}, branch: "main" },
    });
    return created.id;
}

// Remove everything from a previous run so the dataset is exactly what eval-data.ts describes.
async function clearEvalData(): Promise<void> {
    const videos = await prisma.video.findMany({
        where: { folderKey: { startsWith: EVAL_FOLDER_PREFIX } },
        select: { id: true },
    });
    const videoIds = videos.map(v => v.id);
    if (videoIds.length > 0) {
        const revisions = await prisma.videoRevision.findMany({ where: { videoId: { in: videoIds } }, select: { id: true } });
        const revisionIds = revisions.map(r => r.id);
        await prisma.vCSRevisionLink.deleteMany({ where: { videoRevisionId: { in: revisionIds } } });
        await prisma.videoEvent.deleteMany({ where: { videoRevisionId: { in: revisionIds } } });
        await prisma.videoComment.deleteMany({ where: { videoId: { in: videoIds } } });
        await prisma.userVideoReadStatus.deleteMany({ where: { videoId: { in: videoIds } } });
        // latestRevision points back at a revision row, so detach it before deleting revisions.
        await prisma.video.updateMany({ where: { id: { in: videoIds } }, data: { latestRevisionNum: null } });
        await prisma.videoRevision.deleteMany({ where: { videoId: { in: videoIds } } });
        await prisma.video.deleteMany({ where: { id: { in: videoIds } } });
    }
    await prisma.vCSCachedMerge.deleteMany({ where: { repoName: EVAL_REPO_NAME } });
    await prisma.vCSCachedCommit.deleteMany({ where: { repoName: EVAL_REPO_NAME } });
}

type RelevanceResult = { relevance: string; relevanceReason: string };

// Mirrors scoreRelevance() in src/server/lib/vcs/relevance.ts closely enough for fixture data:
// a file under a watched directory is "high", anything else is "unlikely".
function relevanceFor(files: string[], watchPaths: string[]): RelevanceResult {
    if (watchPaths.length === 0) {
        return { relevance: "high", relevanceReason: "no filter configured" };
    }
    const matched = files.find(f => watchPaths.some(w => f === w || f.startsWith(w.replace(/\/$/, "") + "/")));
    return matched
        ? { relevance: "high", relevanceReason: `vcsWatchPaths match: ${matched}` }
        : { relevance: "unlikely", relevanceReason: "no vcsWatchPaths match" };
}

async function seedVcs(
    videoRevisionId: string,
    vcsConfigId: string,
    vcs: NonNullable<EvalRevision["vcs"]>,
    watchPaths: string[],
    rangeFrom: Date,
    rangeTo: Date,
) {
    const mergeResults: ({ cachedMergeId: string } & RelevanceResult)[] = [];
    for (const pr of vcs.pullRequests ?? []) {
        const merge = await prisma.vCSCachedMerge.create({
            data: {
                id: randomUUID(),
                externalId: String(pr.number),
                repoName: EVAL_REPO_NAME,
                title: pr.title,
                description: pr.description ?? null,
                author: pr.author,
                mergedAt: daysAgo(pr.mergedDaysAgo),
                url: `https://example.com/${EVAL_REPO_NAME}/pull/${pr.number}`,
                labels: pr.labels ?? [],
                files: pr.files,
                filesFetchedAt: new Date(),
            },
        });
        mergeResults.push({ cachedMergeId: merge.id, ...relevanceFor(pr.files, watchPaths) });
    }
    const commitResults: ({ cachedCommitId: string } & RelevanceResult)[] = [];
    for (const commit of vcs.commits ?? []) {
        const cached = await prisma.vCSCachedCommit.create({
            data: {
                id: randomUUID(),
                hash: commit.hash,
                repoName: EVAL_REPO_NAME,
                shortHash: commit.hash.slice(0, 7),
                message: commit.message,
                author: commit.author,
                committedAt: daysAgo(commit.committedDaysAgo),
                url: `https://example.com/${EVAL_REPO_NAME}/commit/${commit.hash}`,
                files: commit.files,
                filesFetchedAt: new Date(),
            },
        });
        commitResults.push({ cachedCommitId: cached.id, ...relevanceFor(commit.files, watchPaths) });
    }
    await prisma.vCSRevisionLink.create({
        data: {
            id: randomUUID(),
            videoRevisionId,
            vcsConfigId,
            rangeFrom,
            rangeTo,
            fetchedAt: new Date(),
            summary: vcs.summary ?? null,
            mergeResults,
            commitResults,
        },
    });
}

async function seedVideo(video: EvalVideo, users: Map<string, User>, kindIds: Map<string, string>, vcsConfigId: string) {
    const created = await prisma.video.create({
        data: {
            id: randomUUID(),
            title: video.title,
            folderKey: `${EVAL_FOLDER_PREFIX}${video.folder}`,
            vcsWatchPaths: video.vcsWatchPaths ?? [],
            deleted: video.deleted ?? false,
            latestUpdatedAt: daysAgo(Math.min(...video.revisions.map(r => r.daysAgo))),
        },
    });

    let previousUploadedAt: Date | null = null;
    for (const [index, rev] of video.revisions.entries()) {
        const revisionNumber = index + 1;
        const uploadedAt = daysAgo(rev.daysAgo);
        const revision = await prisma.videoRevision.create({
            data: {
                id: randomUUID(),
                videoId: created.id,
                revision: revisionNumber,
                filePath: `videos/eval/${video.key}/rev_${String(revisionNumber).padStart(3, "0")}.mp4`,
                uploadedAt,
                tags: rev.tags,
                summary: rev.summary ?? null,
            },
        });

        for (const comment of rev.comments ?? []) {
            const user = users.get(comment.user);
            if (!user) throw new Error(`Unknown eval user: ${comment.user}`);
            await prisma.videoComment.create({
                data: {
                    id: randomUUID(),
                    videoId: created.id,
                    videoRevNum: revisionNumber,
                    userName: user.displayName,
                    userEmail: user.email ?? "",
                    comment: comment.text,
                    time: comment.time,
                    issueId: comment.issueId ?? null,
                    drawingPath: comment.drawing ? `/drawings/eval/${video.key}.png` : null,
                    hasDrawing: Boolean(comment.drawing),
                    createdAt: uploadedAt,
                },
            });
        }

        if (rev.events && rev.events.length > 0) {
            await prisma.videoEvent.createMany({
                data: rev.events.map((e, seq) => ({
                    id: randomUUID(),
                    videoRevisionId: revision.id,
                    kindId: kindIds.get(e.kind)!,
                    startMs: e.startMs,
                    endMs: e.endMs,
                    data: e.data,
                    seq,
                })),
            });
        }

        if (rev.vcs) {
            const rangeFrom = previousUploadedAt ?? daysAgo(rev.daysAgo + 30);
            await seedVcs(revision.id, vcsConfigId, rev.vcs, video.vcsWatchPaths ?? [], rangeFrom, uploadedAt);
        }
        previousUploadedAt = uploadedAt;
    }

    await prisma.video.update({
        where: { id: created.id },
        data: { latestRevisionNum: video.revisions.length },
    });
}

async function main() {
    console.log(`Resetting eval data under "${EVAL_FOLDER_PREFIX}"...`);
    await clearEvalData();

    const users = await upsertUsers();
    const kindLabels = [...new Set(EVAL_VIDEOS.flatMap(v => v.revisions.flatMap(r => (r.events ?? []).map(e => e.kind))))];
    const kindIds = await upsertEventKinds(kindLabels);
    const vcsConfigId = await ensureVcsConfig();

    for (const video of EVAL_VIDEOS) {
        await seedVideo(video, users, kindIds, vcsConfigId);
    }
    console.log(`Seeded ${EVAL_VIDEOS.length} eval videos.`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
