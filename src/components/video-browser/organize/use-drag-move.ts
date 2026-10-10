import { useRef, useState, type ComponentProps, type DragEvent } from "react";
import { toast } from "sonner";
import { destination, useMovers, type MoveSource } from "@/components/video-browser/organize/operations/movers";

type DragProps = Pick<
    ComponentProps<"button">,
    "draggable" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
>;

// Long enough that dragging across a closed folder on the way elsewhere leaves it closed.
const OPEN_DELAY_MS = 700;
// A drag that leaves for the button's own icon or text, or another row of the same folder, comes
// back within this time (dragover repeats about every 350 ms), so the highlight holds.
const LEAVE_DELAY_MS = 400;

type Options = {
    // Opens a folder and the folders above it, so a closed one can be dropped into.
    reveal: (path: string) => void;
    // Called with the folder the moved video or folder ended up in.
    onMoved: (folderKey: string) => void;
};

// Rows and folder headers are dragged onto folder headers, the top-level row, or a video's row,
// which stands for the folder it is in, as in Finder. The source is kept here rather than in
// dataTransfer, which can't be read during dragover to decide whether a folder accepts the drop.
export function useDragMove({ reveal, onMoved }: Options) {
    const { move } = useMovers();
    const [source, setSource] = useState<MoveSource | null>(null);
    const [target, setTarget] = useState<string | null>(null);
    // Not state: neighbouring buttons fire dragenter and dragleave before a re-render.
    const targetRef = useRef<string | null>(null);
    const openTimer = useRef<number | undefined>(undefined);
    const leaveTimer = useRef<number | undefined>(undefined);

    const aim = (path: string | null) => {
        window.clearTimeout(openTimer.current);
        window.clearTimeout(leaveTimer.current);
        targetRef.current = path;
        setTarget(path);
        if (path) {
            openTimer.current = window.setTimeout(() => reveal(path), OPEN_DELAY_MS);
        }
    };

    const end = () => {
        aim(null);
        setSource(null);
    };

    const dragFrom = (from: MoveSource): DragProps => ({
        draggable: true,
        onDragStart: (e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "video" in from ? from.video.title : from.folderPath);
            setSource(from);
        },
        onDragEnd: end,
    });

    // Drops into the folder at `path`; `target` is that folder while something is held over it.
    const dropOn = (path: string): DragProps => {
        const accept = (e: DragEvent<HTMLButtonElement>) => {
            if (!source || destination(source, path) === null) {
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            window.clearTimeout(leaveTimer.current);
            if (targetRef.current !== path) {
                aim(path);
            }
        };

        return {
            onDragEnter: accept,
            onDragOver: accept,
            onDragLeave: () => {
                window.clearTimeout(leaveTimer.current);
                leaveTimer.current = window.setTimeout(() => {
                    if (targetRef.current === path) {
                        aim(null);
                    }
                }, LEAVE_DELAY_MS);
            },
            onDrop: (e) => {
                const to = source && destination(source, path);
                const from = source;
                end();
                if (!from || to === null) {
                    return;
                }

                e.preventDefault();
                void move(from, to).then((refused) => {
                    if (refused) {
                        toast.error(refused);
                        return;
                    }
                    onMoved(path);
                });
            },
        };
    };

    return { dragFrom, dropOn, target };
}
