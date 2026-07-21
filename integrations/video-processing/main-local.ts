import { processVideo, prisma } from "./core.js";
import { JobStatus, VideoRevision } from "@prisma/client";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUnprocessedVideoRevisions(limit: number): Promise<VideoRevision[]> {
    return prisma().videoRevision.findMany({
        where: {
            deleted: false,
            video: { deleted: false },
            processingJob: null,
        },
        orderBy: [{ uploadedAt: "asc" }],
        take: limit,
    });
}

async function shutdownProcessingResources(): Promise<void> {
    await prisma().$disconnect();
}

export async function runLocalWorker(): Promise<void> {
    const batchSize = 10;
    const intervalMs = 10_000;

    console.log(
        `video-processing worker started: intervalMs=${intervalMs}, batchSize=${batchSize}`,
    );

    let stopping = false;
    const onSignal = (signal: string) => {
        console.log(`video-processing worker received ${signal}; shutting down`);
        stopping = true;
    };

    process.on("SIGINT", () => onSignal("SIGINT"));
    process.on("SIGTERM", () => onSignal("SIGTERM"));

    while (!stopping) {
        const pendingVideos = await fetchUnprocessedVideoRevisions(batchSize);
        if (pendingVideos.length === 0) {
            // console.log("No pending videos found, waiting...");
        } else {
            let successCounter = 0;
            let failureCounter = 0;
            console.log(`Found ${pendingVideos.length} pending videos, processing...`);
            for (const videoRev of pendingVideos) {
                try {
                    const status = await processVideo(videoRev.filePath, videoRev.videoId, videoRev.id);
                    if (status === JobStatus.succeeded) {
                        successCounter += 1;
                    } else {
                        failureCounter += 1;
                    }
                } catch (error) {
                    console.error(`Error processing videoRevId ${videoRev.id}:`, error);
                }
            }
            console.log(`video-processing cycle: processed=${pendingVideos.length} videos, success=${successCounter}, failure=${failureCounter}`);
        }

        if (!stopping) {
            await sleep(intervalMs);
        }
    }

    await shutdownProcessingResources();
    console.log("video-processing worker stopped");
}

runLocalWorker().catch(async (error) => {
    console.error("video-processing worker crashed", error);
    await shutdownProcessingResources();
    process.exit(1);
});
