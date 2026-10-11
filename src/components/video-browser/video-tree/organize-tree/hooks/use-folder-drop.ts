import { toast } from "sonner";
import { useDragDrop } from "@/lib/hooks/use-drag-drop";
import { planMove, TOP, useMovers, type MoveSource } from "@/components/video-browser/video-tree/organize-tree/hooks/operations/movers";

type Options = {
    // Opens a folder and the folders above it, so a closed one can be dropped into.
    reveal: (path: string) => void;
    // Called with the folder the moved videos and folders ended up in.
    onMoved: (folderKey: string) => void;
};

// Rows and folder headers are dragged onto folder headers, the top-level row, or a video's row,
// which stands for the folder it is in, as in Finder.
export function useFolderDrop({ reveal, onMoved }: Options) {
    const { move } = useMovers();

    const drag = useDragDrop<MoveSource[]>({
        accepts: (sources, path) => planMove(sources, path) !== null,
        onDrop: (sources, path) => {
            void move(planMove(sources, path)!).then((refused) => {
                if (refused) {
                    toast.error(refused);
                    return;
                }

                onMoved(path);
            });
        },
        onLinger: reveal,
    });

    // Props for the top-level row, which only takes folders.
    const dropOnTop = () => ({
        ...drag.dropOn(TOP),
        "data-drop-target": drag.target === TOP,
    });

    return { ...drag, dropOnTop };
}
