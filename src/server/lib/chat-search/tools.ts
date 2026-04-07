import { prisma } from "@/server/lib/db";
import { ToolDefinition, ToolCall } from "@/server/lib/integration-clients/llm-client";

export const chatSearchTools: ToolDefinition[] = [
    {
        name: "list_videos",
        description: "List videos in Video Review. Supports filtering by title, tags, and upload date range.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Filter by video title (partial match)" },
                tags: { type: "string", description: "Filter by tags (comma-separated, e.g. 'bug,cutscene')" },
                videoFrom: { type: "string", description: "Filter videos uploaded after this date (ISO 8601)" },
                videoTo: { type: "string", description: "Filter videos uploaded before this date (ISO 8601)" },
                includeRevisions: { type: "boolean", description: "Include all revisions in each video" },
            },
        },
    },
    {
        name: "get_video",
        description: "Get details of a single video including all revisions, tags, and summary.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Video UUID" },
            },
            required: ["id"],
        },
    },
    {
        name: "list_comments",
        description: "List review comments. Can be filtered by video, text content, date range, or whether they have drawings/issue links.",
        inputSchema: {
            type: "object",
            properties: {
                videoId: { type: "string", description: "Filter by video UUID" },
                filterText: { type: "string", description: "Filter comments by text content" },
                from: { type: "string", description: "Filter comments created after this date (ISO 8601)" },
                to: { type: "string", description: "Filter comments created before this date (ISO 8601)" },
                hasDrawing: { type: "boolean", description: "Only return comments that have a drawing annotation" },
                hasIssue: { type: "boolean", description: "Only return comments linked to a Jira issue" },
                selectRevision: { type: "number", description: "Filter by video revision number" },
                user: { type: "string", description: "Filter comments by user name or email" },
            },
        },
    },
    {
        name: "list_video_events",
        description: "List analysis events for a video (e.g. errors, subtitle events). Events are keyed by kind and time range.",
        inputSchema: {
            type: "object",
            properties: {
                videoId: { type: "string", description: "Video UUID" },
                kind: { type: "string", description: "Filter by event kind label (e.g. 'error', 'subtitle')" },
                filterText: { type: "string", description: "Filter events by their data content" },
                selectRevision: { type: "number", description: "Revision number to query events for (defaults to latest)" },
            },
            required: ["videoId"],
        },
    },
    {
        name: "list_tags",
        description: "List all tags that exist across all videos in Video Review.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];

export async function executeTool(call: ToolCall): Promise<string> {
    try {
        const result = await dispatch(call);
        return JSON.stringify(result);
    } catch (err) {
        return JSON.stringify({ error: String(err) });
    }
}

async function dispatch(call: ToolCall): Promise<unknown> {
    const input = call.input;

    switch (call.name) {
        case "list_videos": {
            const name = input.name as string | undefined;
            const tags = typeof input.tags === "string"
                ? input.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
                : undefined;
            const videoFrom = input.videoFrom as string | undefined;
            const videoTo = input.videoTo as string | undefined;
            const includeRevisions = input.includeRevisions as boolean | undefined;

            return prisma.video.findMany({
                where: {
                    deleted: false,
                    ...(name ? { title: { contains: name } } : {}),
                    ...(videoFrom || videoTo ? {
                        latestRevision: {
                            is: {
                                deleted: false,
                                ...(videoFrom || videoTo ? {
                                    uploadedAt: {
                                        ...(videoFrom ? { gte: new Date(videoFrom) } : {}),
                                        ...(videoTo ? { lte: new Date(videoTo) } : {}),
                                    },
                                } : {}),
                                ...(tags?.length ? { tags: { hasSome: tags } } : {}),
                            },
                        },
                    } : tags?.length ? {
                        latestRevision: { is: { deleted: false, tags: { hasSome: tags } } },
                    } : {}),
                },
                include: {
                    latestRevision: { select: { revision: true, uploadedAt: true, tags: true } },
                    ...(includeRevisions ? { revisions: { where: { deleted: false }, orderBy: { revision: "asc" } } } : {}),
                },
                orderBy: [{ folderKey: "asc" }, { title: "asc" }],
            });
        }

        case "get_video": {
            const id = input.id as string;
            return prisma.video.findUnique({
                where: { id },
                include: { revisions: { orderBy: { revision: "desc" } } },
            });
        }

        case "list_comments": {
            const videoId = input.videoId as string | undefined;
            const filterText = input.filterText as string | undefined;
            const from = input.from as string | undefined;
            const to = input.to as string | undefined;
            const hasDrawing = input.hasDrawing as boolean | undefined;
            const hasIssue = input.hasIssue as boolean | undefined;
            const selectRevision = input.selectRevision as number | undefined;
            const user = input.user as string | undefined;

            return prisma.videoComment.findMany({
                where: {
                    deleted: false,
                    ...(videoId ? { videoId } : {}),
                    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
                    ...(selectRevision != null ? { videoRevNum: selectRevision } : {}),
                    ...(hasIssue ? { issueId: { not: null } } : {}),
                    ...(hasDrawing ? { drawingPath: { not: null } } : {}),
                    ...(user ? { userName: { contains: user } } : {}),
                    ...(filterText ? { comment: { contains: filterText } } : {}),
                },
                orderBy: { time: "asc" },
            });
        }

        case "list_video_events": {
            const videoId = input.videoId as string;
            const kind = input.kind as string | undefined;
            const filterText = input.filterText as string | undefined;
            const selectRevision = input.selectRevision as number | undefined;

            return prisma.videoEvent.findMany({
                where: {
                    videoRevision: {
                        videoId,
                        ...(selectRevision != null ? { revision: selectRevision } : {}),
                    },
                    ...(kind ? { kind: { label: kind } } : {}),
                    ...(filterText ? { data: { contains: filterText } } : {}),
                },
                include: { kind: { select: { label: true } } },
                orderBy: [{ startMs: "asc" }, { seq: "asc" }],
            });
        }

        case "list_tags": {
            const videos = await prisma.video.findMany({
                where: { deleted: false },
                include: { latestRevision: { select: { tags: true } } },
            });
            return Array.from(
                new Set(
                    videos
                        .flatMap((v) => v.latestRevision?.tags ?? [])
                        .map((t) => t.trim())
                        .filter(Boolean)
                )
            ).sort((a, b) => a.localeCompare(b));
        }

        default:
            throw new Error(`Unknown tool: ${call.name}`);
    }
}
