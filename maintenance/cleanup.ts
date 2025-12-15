import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import fs from "fs/promises";

const EXPIRE_DAYS = 14;
const isDryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function main() {
    const threshold = dayjs().subtract(EXPIRE_DAYS, "day");

    console.log("=== Cleanup Start ===");
    console.log(`Threshold: ${threshold.toISOString()}`);
    if (isDryRun) console.log("** DRY RUN MODE (ファイル・DB削除しません) **");

    // * 最新 uploadedAt を videoId ごとに取得
    const latestInfo = await prisma.videoRevision.groupBy({
        by: ["videoId"],
        _max: { uploadedAt: true },
    });

    // * 古い videoId を抽出
    const outdatedVideoIds = latestInfo
        .filter(item => dayjs(item._max.uploadedAt).isBefore(threshold))
        .map(item => item.videoId);

    console.log("Outdated videoIds:", outdatedVideoIds);

    if (outdatedVideoIds.length === 0) {
        console.log("No outdated videos. Finished.");
        return;
    }

    // * 古い videoId の全 revision 取得
    const outdatedRevisions = await prisma.videoRevision.findMany({
        where: { videoId: { in: outdatedVideoIds } },
        orderBy: { uploadedAt: "desc" },
    });

    // * videoId ごとに grouping → 最新のみ残す
    const revisionsByVideo = new Map<
        string,
        { id: string; filePath: string; uploadedAt: Date }[]
    >();

    for (const r of outdatedRevisions) {
        if (!revisionsByVideo.has(r.videoId)) {
            revisionsByVideo.set(r.videoId, []);
        }
        revisionsByVideo.get(r.videoId)!.push(r);
    }

    let deleteTargets: { id: string; fileName: string }[] = [];

    for (const [videoId, list] of revisionsByVideo.entries()) {
        const [latest, ...oldOnes] = list;

        console.log(`Video ${videoId}: keep latest ${latest.id}, delete ${oldOnes.length}`);

        for (const rev of oldOnes) {
            deleteTargets.push({
                id: rev.id,
                fileName: rev.filePath.replace("/api", ""),
            });
        }
    }

    // * --dry-run - 出力だけして終了
    if (isDryRun) {
        console.log("\n=== DRY RUN: 削除予定一覧 ===");
        for (const item of deleteTargets) {
            console.log(`Delete: DB id=${item.id}, file=${item.fileName}`);
        }
        console.log("DRY RUN 終了（削除処理は実行していません）");
        return;
    }

    // * ファイル削除
    for (const item of deleteTargets) {
        const fp = item.fileName;
        try {
            await fs.rm(fp, { force: true });
            console.log(`Removed file: ${fp}`);
        } catch {
            console.warn(`Failed to remove file: ${fp}`);
        }
    }

    // * DB 削除
    if (deleteTargets.length > 0) {
        await prisma.videoRevision.deleteMany({
            where: { id: { in: deleteTargets.map(t => t.id) } },
        });
    }

    console.log("=== Cleanup Finished ===");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
