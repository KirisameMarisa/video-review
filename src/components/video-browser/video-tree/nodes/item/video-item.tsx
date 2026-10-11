import { useContext, type ComponentProps, type ReactNode } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { TreeScrollContext } from "@/components/video-browser/video-tree";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

function ItemThumbnail({ video }: { video: VideoWithRevision }) {
    const containerRef = useContext(TreeScrollContext);
    const urls = useThumbnailGridStore((s) => s.urls);
    const cacheUrl = useThumbnailGridStore((s) => s.cacheUrl);

    return (
        <div className="w-20 shrink-0 thumb-frame">
            <ThumbnailLazyLoader video={video} containerRef={containerRef} cache={urls} onResolve={cacheUrl} />
        </div>
    );
}

type ButtonProps = ComponentProps<typeof SidebarMenuButton> & {
    video: VideoWithRevision;
};

// An item: the video's thumbnail, then what each list shows of it.
export function VideoItemButton({ video, children, ...props }: ButtonProps) {
    return (
        <SidebarMenuButton {...props} size="auto">
            <ItemThumbnail video={video} />
            {children}
        </SidebarMenuButton>
    );
}

// The item with a field in place of the title, as a plain element since a field can't sit inside
// a button.
export function VideoItemField({ video, children }: { video: VideoWithRevision; children: ReactNode }) {
    return (
        <SidebarMenuButton asChild size="auto">
            <div>
                <ItemThumbnail video={video} />
                {children}
            </div>
        </SidebarMenuButton>
    );
}
