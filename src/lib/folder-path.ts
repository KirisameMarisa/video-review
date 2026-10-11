// Folders exist only as the paths in videos' folder keys, such as "a/b", with "" for the top level.

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
