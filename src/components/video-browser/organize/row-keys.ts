// Names a video's row or a folder's header wherever organize mode keeps track of one, such as the
// one being renamed or those picked.
export type RowKey = `video:${string}` | `folder:${string}`;

export const videoRow = (id: string): RowKey => `video:${id}`;
export const folderRow = (path: string): RowKey => `folder:${path}`;

// The video id or folder path a key was made from.
export function parseRow(key: RowKey): { videoId: string } | { folderPath: string } {
    return key.startsWith("folder:")
        ? { folderPath: key.slice("folder:".length) }
        : { videoId: key.slice("video:".length) };
}
