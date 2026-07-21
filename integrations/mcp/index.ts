import "dotenv/config";
import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createClient } from "./client.js";

const baseUrl = process.env.VIDEO_REVIEW_SERVER_URL ?? "http://localhost:3489";
const apiToken = process.env.VIDEO_REVIEW_API_TOKEN ?? "";

if (!apiToken) {
    process.stderr.write(
        "Warning: VIDEO_REVIEW_API_TOKEN is not set. Requests will likely fail.\n",
    );
}

const client = createClient({ baseUrl, apiToken });

const server = new McpServer({ name: "video-review", version: "1.0.0" });

server.registerTool(
    "list_videos",
    {
        description: "List videos in Video Review. Supports filtering by title, tags, and upload date range.",
        inputSchema: {
            name: z.string().optional().describe("Filter by video title (partial match)"),
            tags: z.string().optional().describe("Filter by tags (comma-separated, e.g. 'bug,cutscene')"),
            videoFrom: z.string().optional().describe("Filter videos uploaded after this date (ISO 8601)"),
            videoTo: z.string().optional().describe("Filter videos uploaded before this date (ISO 8601)"),
            includeRevisions: z.boolean().optional().describe("Include all revisions in each video"),
        },
    },
    async ({ name, tags, videoFrom, videoTo, includeRevisions }) => {
        const data = await client.get("/videos", {
            name,
            tags,
            videoFrom,
            videoTo,
            includeRevisions: includeRevisions ? "true" : undefined,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
);

server.registerTool(
    "get_video",
    {
        description: "Get details of a single video including all revisions, tags, and summary.",
        inputSchema: {
            id: z.string().describe("Video UUID"),
        },
    },
    async ({ id }) => {
        const data = await client.get(`/videos/${id}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
);

server.registerTool(
    "list_comments",
    {
        description: "List review comments. Can be filtered by video, text content, date range, or whether they have drawings/issue links.",
        inputSchema: {
            videoId: z.string().optional().describe("Filter by video UUID"),
            filterText: z.string().optional().describe("Filter comments by text content"),
            from: z.string().optional().describe("Filter comments created after this date (ISO 8601)"),
            to: z.string().optional().describe("Filter comments created before this date (ISO 8601)"),
            hasDrawing: z.boolean().optional().describe("Only return comments that have a drawing annotation"),
            hasIssue: z.boolean().optional().describe("Only return comments linked to a Jira issue"),
            selectRevision: z.number().optional().describe("Filter by video revision number"),
            user: z.string().optional().describe("Filter comments by user name or email"),
        },
    },
    async ({ videoId, filterText, from, to, hasDrawing, hasIssue, selectRevision, user }) => {
        const data = await client.get("/comments", {
            videoId,
            filterText,
            from,
            to,
            hasDrawing: hasDrawing ? "true" : undefined,
            hasIssue: hasIssue ? "true" : undefined,
            selectRevision: selectRevision != null ? String(selectRevision) : undefined,
            user,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
);

server.registerTool(
    "list_video_events",
    {
        description: "List analysis events for a video (e.g. detected objects, shot types, audio anomalies). Events are keyed by kind and time range.",
        inputSchema: {
            videoId: z.string().describe("Video UUID"),
            kind: z.string().optional().describe("Filter by event kind label (e.g. 'object_detection', 'text_detection', 'shot_type')"),
            filterText: z.string().optional().describe("Filter events by their data content"),
            selectRevision: z.number().optional().describe("Revision number to query events for (defaults to latest)"),
        },
    },
    async ({ videoId, kind, filterText, selectRevision }) => {
        const data = await client.get(`/videos/${videoId}/events`, {
            kind,
            filterText,
            selectRevision: selectRevision != null ? String(selectRevision) : undefined,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
);

server.registerTool(
    "list_tags",
    {
        description: "List all tags that exist across all videos in Video Review.",
    },
    async () => {
        const data = await client.get("/videos/tags");
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
);

const transport = process.env.MCP_TRANSPORT === "http"
    ? await startHttpServer()
    : new StdioServerTransport();

await server.connect(transport);

async function startHttpServer(): Promise<StreamableHTTPServerTransport> {
    const port = parseInt(process.env.MCP_PORT ?? "3490", 10);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    const httpServer = http.createServer(async (req, res) => {
        if (req.url === "/mcp") {
            await transport.handleRequest(req, res);
        } else {
            res.writeHead(404).end();
        }
    });

    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
    process.stderr.write(`MCP server listening on http://0.0.0.0:${port}/mcp\n`);
    return transport;
}
