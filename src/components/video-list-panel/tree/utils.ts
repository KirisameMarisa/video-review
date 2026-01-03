import { Video } from "@/lib/db-types";
import { VideoNode } from "@/components/video-list-panel/tree/types";import dayjs from "dayjs";
import { NodeApi } from "react-arborist";
;

export function buildTree(
    videos: Video[],
    unReadVideoIds: string[],
): VideoNode[] {
    const root: Record<string, any> = {};

    for (const v of videos) {
        const parts = v.folderKey.split("/").filter(Boolean);
        let node = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!node[part]) {
                // folder node
                node[part] = {
                    id: parts.slice(0, i + 1).join("/"),
                    name: part,
                    type: "folder",
                    children: {},
                };
            }
            if (i === parts.length - 1) {
                // movie node
                node[part].children[v.id] = {
                    id: v.id,
                    name: v.title,
                    type: "video",
                    video: v,
                };
            }
            node = node[part].children;
        }
    }

    const toArray = (obj: Record<string, any>): VideoNode[] =>
        Object.values(obj).map((n: any) => ({
            id: n.id,
            name: n.name,
            type: n.type,
            unread: false,
            ...(n.video ? { video: n.video } : {}),
            ...(n.children ? { children: toArray(n.children) } : {}),
        }));

    const final = [
        ...[buildTodayUpdateFolder(videos)],
        ...toArray(root)
            .map(pruneVideoNode)
            .filter((n): n is VideoNode => n !== null),
    ];

    markUnread(final, unReadVideoIds);
    return final;
}

export function markUnread(nodes: VideoNode[], unReadVideoIds: string[]): boolean {
    let hasUnread = false;

    for (const node of nodes) {
        let unread = false;

        if (node.type === "video") {
            unread = unReadVideoIds.includes(node.id);
        }

        if (node.children) {
            const childUnread = markUnread(node.children, unReadVideoIds);
            unread = unread || childUnread;
        }

        node.unread = unread;
        if (unread) hasUnread = true;
    }

    return hasUnread;
}

export function pruneVideoNode(node: VideoNode): VideoNode | null {
    if (node.type === "video") return node;

    const prunedChildren = (node.children ?? [])
        .map(pruneVideoNode)
        .filter((c): c is VideoNode => c !== null);

    if (prunedChildren.length === 0) {
        return null;
    }

    return { ...node, children: prunedChildren };
}

export function buildTodayUpdateFolder(videos: Video[]): VideoNode {
    const todayVideos = videos.filter((v) =>
        dayjs(v.latestUpdatedAt).isSame(dayjs(), "day"),
    );

    return {
        id: "_today",
        name: "Today Update",
        type: "folder",
        unread: false,
        children: todayVideos.map((v) => ({
            id: v.id + "_today",
            name: v.title,
            type: "video",
            video: v,
            unread: false,
        })),
    };
}

export function findPath(
    root: NodeApi<VideoNode>,
    targetId: string,
): NodeApi<VideoNode>[] | null {
    const path: NodeApi<VideoNode>[] = [];

    function dfs(node: NodeApi<VideoNode>): boolean {
        path.push(node);

        if (node.id === targetId) {
            return true;
        }

        for (const child of node.children ?? []) {
            if (dfs(child)) return true;
        }

        path.pop();
        return false;
    }

    return dfs(root) ? path : null;
}
