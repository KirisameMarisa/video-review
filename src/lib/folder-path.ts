// Folders exist only as the paths in videos' folder keys, such as "a/b", with "" for the top level.

export const MAX_FOLDER_KEY_LENGTH = 1024;

export function parentPath(path: string): string {
    return path.slice(0, Math.max(path.lastIndexOf("/"), 0));
}

export function folderName(path: string): string {
    return path.slice(path.lastIndexOf("/") + 1);
}

export function childPath(parent: string, name: string): string {
    return parent ? `${parent}/${name}` : name;
}

// "a" holds itself and "a/b", but not "ab".
export function isInFolder(key: string, folder: string): boolean {
    return key === folder || key.startsWith(`${folder}/`);
}

// "a/b/" typed by hand means "a/b". A loop, not /\/+$/: that regex backtracks quadratically on untrusted input.
export function trimTrailingSlashes(path: string): string {
    let end = path.length;
    while (end > 0 && path[end - 1] === "/") {
        end--;
    }
    return path.slice(0, end);
}
