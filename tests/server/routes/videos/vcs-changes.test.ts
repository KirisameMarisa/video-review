import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { videoByIdRouter } from "@/server/routes/videos/[id]";
import { startOfUTCDay } from "@/server/lib/vcs/cache";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const createdVideoIds: string[] = [];
const createdRevisionIds: string[] = [];
const createdVCSConfigIds: string[] = [];
const createdCachedMergeIds: string[] = [];
const createdCachedCommitIds: string[] = [];

async function createTestVideo(opts: { vcsWatchPaths?: string[] } = {}) {
    const videoId = randomUUID();
    const rev1Id  = randomUUID();
    const rev2Id  = randomUUID();

    const rev2UploadedAt = new Date();
    const rev1UploadedAt = new Date(rev2UploadedAt.getTime() - 2 * 86_400_000);

    await prisma.video.create({
        data: {
            id: videoId,
            title: "VCS Test Video",
            folderKey: "vcs-test",
            vcsWatchPaths: opts.vcsWatchPaths ?? [],
        },
    });

    await prisma.videoRevision.create({
        data: { id: rev1Id, videoId, revision: 1, filePath: "test/rev1.mp4", uploadedAt: rev1UploadedAt },
    });
    await prisma.videoRevision.create({
        data: { id: rev2Id, videoId, revision: 2, filePath: "test/rev2.mp4", uploadedAt: rev2UploadedAt },
    });

    await prisma.video.update({
        where: { id: videoId },
        data: { latestRevisionNum: 2 },
    });

    createdVideoIds.push(videoId);
    createdRevisionIds.push(rev1Id, rev2Id);
    return { videoId, rev1Id, rev1UploadedAt, rev2Id, rev2UploadedAt };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("GET /videos/:id/vcs-changes", () => {
    const app = new Hono();
    app.route("/videos/:id", videoByIdRouter);

    let videoId = "";
    let rev1Id  = "";
    let rev2Id  = "";
    let vcsConfigId = "";

    beforeAll(async () => {
        const created = await createTestVideo();
        videoId = created.videoId;
        rev1Id  = created.rev1Id;
        rev2Id  = created.rev2Id;

        // Create VCSConfig at the outer level so it persists for the entire test file
        // (including the integration test) regardless of parallel test file execution.
        const config = await prisma.vCSConfig.create({
            data: { label: "mock-github", provider: "github", config: {}, branch: "main" },
        });
        vcsConfigId = config.id;
        createdVCSConfigIds.push(vcsConfigId);
    });

    afterAll(async () => {
        await prisma.vCSRevisionLink.deleteMany({ where: { videoRevisionId: { in: createdRevisionIds } } });
        await prisma.vCSConfig.deleteMany({ where: { id: { in: createdVCSConfigIds } } });
        await prisma.vCSFetchedRange.deleteMany({ where: { repoName: { startsWith: "github:" } } });
        await prisma.vCSCachedMerge.deleteMany({ where: { id: { in: createdCachedMergeIds } } });
        await prisma.vCSCachedCommit.deleteMany({ where: { id: { in: createdCachedCommitIds } } });

        await prisma.video.updateMany({ where: { id: { in: createdVideoIds } }, data: { latestRevisionNum: null } });
        await prisma.videoRevision.deleteMany({ where: { id: { in: createdRevisionIds } } });
        await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });


    // -----------------------------------------------------------------------
    // With mocked GitHub provider
    // -----------------------------------------------------------------------

    describe("with mocked GitHub provider", () => {
        beforeAll(async () => {
            // Seed VCSCachedMerge
            const cachedMerge = await prisma.vCSCachedMerge.upsert({
                where: { externalId_repoName: { externalId: "142", repoName: "github:org/repo" } },
                create: {
                    externalId: "142",
                    repoName: "github:org/repo",
                    title: "Fix camera shake in cutscene",
                    description: null,
                    author: "yamada",
                    mergedAt: new Date("2026-03-15T11:20:00Z"),
                    url: "https://github.com/org/repo/pull/142",
                    labels: ["bug", "camera"],
                    files: ["Assets/Scripts/Camera/Shake.cs"],
                    filesFetchedAt: new Date(),
                },
                update: {},
            });
            createdCachedMergeIds.push(cachedMerge.id);

            // Seed VCSCachedCommit
            const cachedCommit = await prisma.vCSCachedCommit.upsert({
                where: { hash_repoName: { hash: "abc1234def5678", repoName: "github:org/repo" } },
                create: {
                    hash: "abc1234def5678",
                    repoName: "github:org/repo",
                    shortHash: "abc1234",
                    message: "Adjust bloom intensity",
                    author: "tanaka",
                    committedAt: new Date("2026-03-18T14:00:00Z"),
                    url: "https://github.com/org/repo/commit/abc1234def5678",
                    files: [],
                    filesFetchedAt: new Date(),
                },
                update: {},
            });
            createdCachedCommitIds.push(cachedCommit.id);

            // Seed VCSRevisionLink with mergeResults / commitResults
            // rangeFrom/rangeTo must align with the revision uploadedAt values (day-rounded)
            // used in createTestVideo so the cache hit path matches.
            const now = new Date();
            const rangeFrom = startOfUTCDay(new Date(now.getTime() - 2 * 86_400_000));
            const rangeTo = startOfUTCDay(now);
            await prisma.vCSRevisionLink.upsert({
                where: { videoRevisionId_vcsConfigId: { videoRevisionId: rev2Id, vcsConfigId: vcsConfigId } },
                create: {
                    videoRevisionId: rev2Id,
                    vcsConfigId: vcsConfigId,
                    rangeFrom,
                    rangeTo,
                    mergeResults: [{ cachedMergeId: cachedMerge.id, relevance: "high", relevanceReason: "vcsWatchPaths match: Assets/Scripts/Camera/Shake.cs" }],
                    commitResults: [{ cachedCommitId: cachedCommit.id, relevance: "unlikely", relevanceReason: "no vcsWatchPaths match" }],
                    fetchedAt: new Date(),
                },
                update: {},
            });
        });

        it("returns 200 with cached change set", async () => {
            vi.stubEnv("VIDEO_REVIEW_VCS_PROVIDER", "github");
            vi.stubEnv("VIDEO_REVIEW_VCS_GITHUB_OWNER", "org");
            vi.stubEnv("VIDEO_REVIEW_VCS_GITHUB_REPO", "repo");
            vi.stubEnv("VIDEO_REVIEW_VCS_GITHUB_TOKEN", "test-token");

            const res = await app.request(`http://localhost/videos/${videoId}/vcs-changes?to=${rev2Id}&from=${rev1Id}`);
            expect(res.status).toBe(200);

            const body = await res.json() as {
                pullRequests: { id: string; title: string; relevance: string }[];
                commits: { shortHash: string; relevance: string }[];
                fromCache: boolean;
            };
            expect(body.fromCache).toBe(true);
            expect(body.pullRequests).toHaveLength(1);
            expect(body.pullRequests[0].title).toBe("Fix camera shake in cutscene");
            expect(body.pullRequests[0].relevance).toBe("high");
            expect(body.commits).toHaveLength(1);
            expect(body.commits[0].shortHash).toBe("abc1234");
        });

        it("returns 404 for unknown video id", async () => {
            vi.stubEnv("VIDEO_REVIEW_VCS_PROVIDER", "github");
            vi.stubEnv("VIDEO_REVIEW_VCS_GITHUB_OWNER", "org");
            vi.stubEnv("VIDEO_REVIEW_VCS_GITHUB_REPO", "repo");
            vi.stubEnv("VIDEO_REVIEW_VCS_GITHUB_TOKEN", "test-token");

            const res = await app.request(`http://localhost/videos/${randomUUID()}/vcs-changes`);
            expect(res.status).toBe(404);
        });
    });
});
