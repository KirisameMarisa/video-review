import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const USERS = [
    {
        displayName: "Bocchi",
        email: "Bocchi@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Bocchi.png",
        role: "admin"
    },
    {
        displayName: "Kita",
        email: "Kita@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Kita.png",
        role: "admin"
    },
    {
        displayName: "Ryo",
        email: "Ryo@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Ryo.png",
        role: "admin"
    },
    {
        displayName: "Nijika",
        email: "Nijika@example.com",
        pass: "pass123",
        avatarPath: "/avatars/Nijika.png",
        role: "admin"
    },
];

const FOLDERS = [
    "01_prototype",
    "02_core_loop",
    "03_battle",
    "04_boss",
    "05_cutscene",
    "06_ui",
    "07_tutorial",
    "08_event",
    "09_debug",
    "10_release_candidate",
];

const COMMENT_TEMPLATES = [
    { user: 0, text: "Um… this cut might be a little fast… or maybe it's just me." },
    { user: 1, text: "This part is really cool! The timing around 2.3s just feels a bit tight though." },
    { user: 2, text: "The cut happens slightly before the motion settles." },
    { user: 0, text: "If it's not too much trouble, maybe easing the transition could help." },
//  { user: 3, text: "Let's apply the timing fix and move on to the next pass." }
];

const VIDEO_EVENT_KINDS = [
    "detected_text",
    "angle_type",
    "shot_type",
    "error_text",
    "dummy_text",
    "transcription",
];

const PROMPT_TEMPLATES = [
    {
        key: "scene-summary-default",
        kinds: ["transcription", "shot_type", "angle_type", "detected_text"],
        prompt:
            "You are an assistant that summarizes video scenes.\n" +
            "Use only the provided inputs and output concise factual summary plus useful tags."
    },
    {
        key: "issue-detection-default",
        kinds: ["error_text", "dummy_text", "detected_text", "transcription"],
        prompt:
            "You are an assistant that finds potential issues in video scenes.\n" +
            "Focus on warnings, placeholder content, and risky patterns."
    },
];

function pick<T>(arr: T[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedUsers() {
    const users = [];

    for (const u of USERS) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                id: randomUUID(),
                displayName: u.displayName,
                avatarPath: u.avatarPath,
                role: u.role,
                identities: {
                    create: {
                        id: randomUUID(),
                        provider: "password",
                        providerUid: u.email,
                        secretHash: await bcrypt.hash(u.pass, 10),
                    }
                }
            },
        });
        users.push(user);
    }
    return users;
}

async function seedRevision(videoId: string) {
    return prisma.videoRevision.create({
        data: {
            id: randomUUID(),
            videoId,
            revision: 1,
            filePath: `videos/demo/rev_001.mp4`,
        },
    });
}

async function seedVideoEventKinds() {
    const kinds = new Map<string, string>();
    for (const label of VIDEO_EVENT_KINDS) {
        const kind = await prisma.videoEventKind.upsert({
            where: { label },
            update: {},
            create: {
                id: randomUUID(),
                label,
            },
        });
        kinds.set(label, kind.id);
    }
    return kinds;
}

async function seedVideoEvents(videoRevisionId: string, kindIdByLabel: Map<string, string>) {
    const shotTypeKindId = kindIdByLabel.get("shot_type");
    const angleTypeKindId = kindIdByLabel.get("angle_type");
    const transcriptionKindId = kindIdByLabel.get("transcription");
    const detectedTextKindId = kindIdByLabel.get("detected_text");

    if (!shotTypeKindId || !angleTypeKindId || !transcriptionKindId || !detectedTextKindId) {
        return;
    }

    await prisma.videoEvent.createMany({
        data: [
            {
                id: randomUUID(),
                videoRevisionId,
                kindId: shotTypeKindId,
                startMs: 0,
                endMs: 5000,
                data: "wide-shot",
                seq: 0,
                contentId: "shot-001",
                links: [
                    { label: "Shot Design Doc", url: "https://example.com/docs/shot-design" },
                    { url: "https://example.com/reference/wide-shot" },
                ],
            },
            {
                id: randomUUID(),
                videoRevisionId,
                kindId: angleTypeKindId,
                startMs: 0,
                endMs: 5000,
                data: "neutral",
                seq: 0,
            },
            {
                id: randomUUID(),
                videoRevisionId,
                kindId: transcriptionKindId,
                startMs: 1000,
                endMs: 4200,
                data: "Sample dialogue line for seed data.",
                seq: 0,
                contentId: "transcription-001",
                links: [
                    { label: "Script", url: "https://example.com/scripts/scene-01" },
                ],
            },
            {
                id: randomUUID(),
                videoRevisionId,
                kindId: detectedTextKindId,
                startMs: 1800,
                endMs: 2200,
                data: "START",
                seq: 0,
            },
        ],
    });
}

async function seedComments(videoId: string, users: User[]) {
    let t = 1.0;
    if (Math.random() < 0.6) return [];

    const comments = [];
    for (let i = 0; i < COMMENT_TEMPLATES.length; i++) {
        const tpl = COMMENT_TEMPLATES[i];
        const user = users[tpl.user];

        comments.push(await prisma.videoComment.create({
            data: {
                id: randomUUID(),
                videoId,
                videoRevNum: 1,
                userName: user.displayName,
                userEmail: user.email ?? "",
                comment: tpl.text,
                time: t,
                drawingPath: (Math.random() < 0.7 && i === 2) ? "/drawings/sample.png" : null,
                issueId: (Math.random() < 0.7 && i === 1) ? "ISSUE-123" : null,
                thumbsUp: (Math.random() < 0.7 && i === 4) ? 2 : 0,
                notifiedProviders: (Math.random() < 0.7 && i === 1) ? ["slack"] : [],
            },
        }));
        t += 8.0;
    }
    return comments;
}

async function seedReadStatus(
    userId: string,
    videoId: string,
    comments: { id: string }[],
) {
    if (comments.length === 0) return;
    if (Math.random() < 0.3) return;

    const lastRead =
        comments[comments.length -1];

    await prisma.userVideoReadStatus.create({
        data: {
            id: randomUUID(),
            userId,
            videoId,
            lastReadCommentId: lastRead.id,
        },
    });
}

async function createBatch(
    count: number,
    opts: {
        daysAgoMax: number;
        deletedRate?: number;
        sceneRate?: number;
        titlePrefix: string;
    },
    users: User[],
    kindIdByLabel: Map<string, string>
) {
    for (let i = 0; i < count; i++) {
        const video = await prisma.video.create({
            data: {
                id: randomUUID(),
                title: `${opts.titlePrefix} #${String(i + 1).padStart(3, "0")}`,
                folderKey: pick(FOLDERS),
                scenePath:
                    Math.random() < (opts.sceneRate ?? 0.4)
                        ? `videos/UnitySample/UnityDemo/rev_001.mp4`
                        : null,
                deleted: Math.random() < (opts.deletedRate ?? 0),
            },
        });

        const revision = await seedRevision(video.id);
        await prisma.video.update({
            where: { id: video.id },
            data: { latestRevisionNum: revision.revision },
        });
        await seedVideoEvents(revision.id, kindIdByLabel);
        const comments = await seedComments(video.id, users);
  
        for (const user of users) {
            await seedReadStatus(user.id, video.id, comments);
        }
    }
}

async function main() {
    console.log("Seeding realistic project data...");
    const users = await seedUsers();
    const kindIdByLabel = await seedVideoEventKinds();

    await createBatch(40, {
        daysAgoMax: 7,
        sceneRate: 0.8,
        titlePrefix: "Gameplay Capture",
    }, users, kindIdByLabel);

    await createBatch(160, {
        daysAgoMax: 30,
        sceneRate: 0.5,
        titlePrefix: "Feature Review",
    }, users, kindIdByLabel);

    await createBatch(250, {
        daysAgoMax: 180,
        sceneRate: 0.2,
        titlePrefix: "Archived Playtest",
    }, users, kindIdByLabel);

    await createBatch(50, {
        daysAgoMax: 90,
        deletedRate: 1,
        sceneRate: 0.1,
        titlePrefix: "Discarded",
    }, users, kindIdByLabel);

    console.log("Done.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
