import { toast } from "sonner";
import { useDragDrop } from "@/lib/hooks/use-drag-drop";
import { destination, useMovers, type MoveSource } from "@/components/video-browser/organize/operations/movers";

type Options = {
    // Opens a folder and the folders above it, so a closed one can be dropped into.
    reveal: (path: string) => void;
    // Called with the folder the moved video or folder ended up in.
    onMoved: (folderKey: string) => void;
};

// Rows and folder headers are dragged onto folder headers, the top-level row, or a video's row,
// which stands for the folder it is in, as in Finder.
export function useFolderDrop({ reveal, onMoved }: Options) {
    const { move } = useMovers();

    return useDragDrop<MoveSource>({
        accepts: (source, path) => destination(source, path) !== null,
        onDrop: (source, path) => {
            void move(source, destination(source, path)!).then((refused) => {
                if (refused) {
                    toast.error(refused);
                    return;
                }

                onMoved(path);
            });
        },
        onLinger: reveal,
    });
}
