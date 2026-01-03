import { useMemo } from "react";
import { NodeRendererProps } from "react-arborist";
import { VideoNode } from "@/components/video-list-panel/tree/types";
import { TreeNodeRow } from "@/components/video-list-panel/tree/tree-node-row";

interface Props extends NodeRendererProps<VideoNode> {
    selectedId?: string;
}

export function NodeRenderer({
    node,
    style,
    selectedId,
}: Props) {
    const isSelected = node.data.video?.id === selectedId;

    const computedStyle = useMemo<React.CSSProperties>(() => {
        const extraLeftPadding = node.level === 0 ? 7 : 0;
        return {
            ...style,
            minWidth: "max-content",
            paddingLeft:
                (Number(style.paddingLeft) || 0) + extraLeftPadding,
        };
    }, [style, node.level]);

    return (
        <TreeNodeRow
            name={node.data.name}
            type={node.data.type}
            unread={node.data.unread}
            selected={isSelected}
            style={computedStyle}
            onClick={() => node.toggle()}
        />
    );
}
