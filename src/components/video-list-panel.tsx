"use client";

import React, {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Tree, NodeRendererProps, TreeApi, NodeApi } from "react-arborist";

import { Folder, Film } from "lucide-react";
import { Video } from "@prisma/client";
import { useVideoStore } from "@/stores/video-store";
import { useRouter } from "next/navigation";
import VideoUploadDialog from "@/components/video-upload";
import { useSize } from "@radix-ui/react-use-size";
import {
    EDateSearchMode,
    VideoFilterParam,
    VideoSearchPopover,
} from "@/components/video-search";
import dayjs from "dayjs";
import { hasUnreadVideoComment } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";

interface VideoNode {
    id: string;
    name: string;
    type: "folder" | "video";
    children?: VideoNode[];
    video?: Video;
    unread: boolean;
}

export default function VideoListPanel() {
    const t = useTranslations("video-list-panel");
    const headerRef = useRef<HTMLDivElement>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const size = useSize(elementRef.current);
    const router = useRouter();
    const { userId } = useAuthStore();
    const { videos, fetchVideos, selectedVideo } = useVideoStore();
    const [videoFilterParam, setVideoFilterParam] = useState<VideoFilterParam>({
        searchMode: "dateFilterOff",
        dateRange: undefined,
        filterText: "",
    });
    const [open, setOpen] = useState(false);
    const [unReadVideoIds, setUnReadVideoIds] = useState<string[]>([]);
    const [bounds, setBounds] = useState({ width: 0, height: 0 });
    const [openNodes, setOpenNodes] = useState<Record<string, boolean>>(() => {
        try {
            const raw = localStorage.getItem("videoTreeOpenNodes");
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });
    const treeRef = useRef<TreeApi<VideoNode>>(null);

    const filteredVideos = useMemo(() => {
        if (!videoFilterParam || !videoFilterParam.filterText) return videos;

        const lower = videoFilterParam.filterText.toLowerCase();

        return videos.filter((v) => {
            return (
                v.title?.toLowerCase().includes(lower) ||
                v.folderKey?.toLowerCase().includes(lower) ||
                v.scenePath?.toLowerCase().includes(lower)
            );
        });
    }, [videos, videoFilterParam?.filterText]);

    const headerHeight = useMemo(() => {
        return headerRef.current ? headerRef.current.getBoundingClientRect().height : 0;
    }, [headerRef.current]);

    const treeHeight = useMemo(() => {
        return Math.max(0, bounds.height - headerHeight);
    }, [bounds.height, headerHeight]);

    useEffect(() => {
        if (!userId) {
            setUnReadVideoIds([]);
            return;
        }

        let cancelled = false;

        hasUnreadVideoComment(userId).then((ids) => {
            if (!cancelled) setUnReadVideoIds(ids);
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    const data = useMemo(
        () =>
            buildTree(
                filteredVideos,
                videoFilterParam.searchMode,
                unReadVideoIds,
            ),
        [filteredVideos],
    );

    const handleFetch = () => {
        if (!videoFilterParam) return;
        if (videoFilterParam.searchMode === undefined) return;

        const mode = videoFilterParam.searchMode;
        const dateRange = videoFilterParam.dateRange;

        switch (mode) {
            case "dateFilterOff":
                fetchVideos(undefined, undefined);
                break;
            case "dateRange":
                fetchVideos(dateRange?.from, dateRange?.to);
                break;
        }
    };

    const handleClose = () => {
        handleFetch();
        setOpen(false);
    };

    useLayoutEffect(() => {
        if (!elementRef.current || !headerRef.current) return;
        const rect = elementRef.current.getBoundingClientRect();
        if (!size?.width || !size?.height) {
            setBounds({
                width: rect.width,
                height: rect.height - headerHeight,
            });
        } else {
            setBounds({
                width: size.width,
                height: size.height - headerHeight,
            });
        }
    }, [size?.width, size?.height]);

    useEffect(() => {
        handleFetch();
    }, [videoFilterParam?.searchMode, videoFilterParam?.dateRange]);

    useEffect(() => {
        localStorage.setItem("videoTreeOpenNodes", JSON.stringify(openNodes));
    }, [openNodes]);

    useEffect(() => {
        const api = treeRef.current;
        if (!api) return;

        for (const [id, isOpen] of Object.entries(openNodes)) {
            if (isOpen) {
                api.open(id);
            } else {
                api.close(id);
            }
        }

        if (!selectedVideo) return;
        const node = api.get(selectedVideo.id);

        if (node) {
            api.scrollTo(selectedVideo.id);
        } else {
            const path = findPath(api.root, selectedVideo.id);
            if (path) {
                for (const node of path.slice(0, -1)) {
                    api.open(node.id);
                }

                requestAnimationFrame(() => {
                    api.scrollTo(selectedVideo.id);
                });
            }
        }
    }, [data, selectedVideo?.id]);

    return (
        <div
            ref={elementRef}
            style={{ minWidth: "210px" }}
            className="vr-panel"
        >
            <VideoUploadDialog open={open} onClose={() => handleClose()} />

            <div ref={headerRef} className="vr-header">
                <div>
                    <span>{t("title")}</span>
                    <VideoSearchPopover
                        videoFilterParam={videoFilterParam}
                        updateVideoFilter={setVideoFilterParam}
                    />
                </div>

                <button
                    onClick={() => setOpen(true)}
                    className="vr-btn-accent"
                >
                    ＋
                </button>
            </div>
            <Tree
                ref={treeRef}
                data={data}
                openByDefault
                rowHeight={28}
                width={bounds.width}
                height={treeHeight}
                paddingBottom={50}
                onToggle={(id) => {
                    const api = treeRef.current;
                    if (!api) return;

                    const node = api.get(id);
                    if (!node) return;

                    setOpenNodes((prev) => ({
                        ...prev,
                        [id]: node.isOpen,
                    }));
                }}
                onSelect={(nodes) => {
                    const node = nodes[0];
                    if (node?.data.type === "video" && node.data.video) {
                        router.replace(
                            `/video-review/review/${node.data.video.id}`,
                        );
                    }
                }}
            >
                {(props) => (
                    <NodeRenderer
                        {...props}
                        selectedId={selectedVideo?.id ?? ""}
                    />
                )}
            </Tree>
        </div>
    );
}

function buildTree(
    videos: Video[],
    searchMode: EDateSearchMode | undefined,
    unReadVideoIds: string[],
): VideoNode[] {
    const root: Record<string, any> = {};

    for (const v of videos) {
        const parts = v.folderKey.split("/").filter(Boolean);
        let node = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!node[part]) {
                node[part] = {
                    id: parts.slice(0, i + 1).join("/"),
                    name: part,
                    type: "folder",
                    children: {},
                };
            }
            if (i === parts.length - 1) {
                // 動画ノード
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
        ...(searchMode === "dateFilterOff"
            ? [buildTodayUpdateFolder(videos)]
            : []),
        ...toArray(root)
            .map(pruneVideoNode)
            .filter((n): n is VideoNode => n !== null),
    ];

    markUnread(final, unReadVideoIds);
    return final;
}

function markUnread(nodes: VideoNode[], unReadVideoIds: string[]): boolean {
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

function pruneVideoNode(node: VideoNode): VideoNode | null {
    if (node.type === "video") return node;

    const prunedChildren = (node.children ?? [])
        .map(pruneVideoNode)
        .filter((c): c is VideoNode => c !== null);

    if (prunedChildren.length === 0) {
        return null;
    }

    return { ...node, children: prunedChildren };
}

function buildTodayUpdateFolder(videos: Video[]): VideoNode {
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

function NodeRenderer({
    node,
    style,
    selectedId,
}: NodeRendererProps<VideoNode> & { selectedId?: string; scenePath?: string }) {
    const isSelected = node.data.video?.id === selectedId;
    const isFolder = node.data.type === "folder";
    const unread = node.data.unread;
    const extraLeftPadding = node.level === 0 ? 7 : 0;

    return (
        <div
            style={{
                ...style,
                paddingLeft:
                    (Number(style.paddingLeft) ?? 0) + extraLeftPadding,
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none truncate ${isSelected
                    ? "bg-[#555] border-l-2 border-[#ff8800]"
                    : "hover:bg-[#222]"
                }`}
            onClick={() => node.toggle()}
        >
            {/* アイコン（フォルダ or 動画） */}
            <div className="relative">
                {isFolder ? (
                    <Folder size={14} className="text-[#ff8800]" />
                ) : (
                    <Film size={14} className="text-[#ff8800]" />
                )}

                {unread && (
                    <span
                        className={[
                            "absolute",
                            "-top-1 -left-1",
                            "text-[8px] px-1 py-[1px]",
                            "bg-red-500 text-white rounded",
                            "leading-none",
                        ].join(" ")}
                    >
                        NEW
                    </span>
                )}
            </div>

            {/* テキスト */}
            <span className="flex items-center gap-1">{node.data.name}</span>
        </div>
    );
}

function findPath(
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
