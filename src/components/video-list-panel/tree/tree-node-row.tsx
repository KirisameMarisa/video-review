import { VideoNode } from "@/components/video-list-panel/tree/types";
import { Folder, Film } from "lucide-react";


interface Props {
    name: string;
    type: VideoNode["type"];
    unread: boolean;
    selected: boolean;
    style: React.CSSProperties;
    onClick: () => void;
}

export function TreeNodeRow({
    name,
    type,
    unread,
    selected,
    style,
    onClick,
}: Props) {
    const isFolder = type === "folder";

    return (
        <div
            style={style}
            onClick={onClick}
            className={[
                "flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none truncate",
                selected
                    ? "bg-[#555] border-l-2 border-[#ff8800]"
                    : "hover:bg-[#222]",
            ].join(" ")}
        >
            <div className="relative">
                {isFolder ? (
                    <Folder size={14} className="text-[#ff8800]" />
                ) : (
                    <Film size={14} className="text-[#ff8800]" />
                )}

                {unread && (
                    <span
                        className={[
                            "absolute -top-1 -left-1",
                            "text-[8px] px-1 py-[1px]",
                            "bg-red-500 text-white rounded leading-none",
                        ].join(" ")}
                    >
                        NEW
                    </span>
                )}
            </div>

            <span className="flex items-center gap-1">{name}</span>
        </div>
    );
}
