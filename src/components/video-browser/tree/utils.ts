import { Video } from "@/lib/db-types";
import { VideoNode } from "@/components/video-browser/tree/types"; import dayjs from "dayjs";
import { NodeApi } from "react-arborist";

export function buildTree(
    videos: Video[],
    unReadVideoIds: string[],
): VideoNode[] {
    const root: VideoNode = {
        id: "root",
        name: "",
        type: "folder",
        children: [],
        unread: false,
    };

    const folderIndex = new Map<string, VideoNode>();
    folderIndex.set("", root);

    for (const v of videos) {
        const parts = v.folderKey.split("/").filter(Boolean);
        let currentPath = "";
        let parent = root;

        for (const part of parts) {
            // Build a stable folder path incrementally (e.g. "01_root/02_child").
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            let folder = folderIndex.get(currentPath);
            if (!folder) {
                folder = {
                    id: currentPath,
                    name: part,
                    type: "folder",
                    children: [],
                    unread: false,
                };
                parent.children.push(folder);
                folderIndex.set(currentPath, folder);
            }
            parent = folder;
        }

        parent.children.push({
            id: v.id,
            name: v.title,
            type: "video",
            children: [],
            video: v,
            unread: false,
        });
    }

    markUnread([root], unReadVideoIds);
    return root.children;
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
