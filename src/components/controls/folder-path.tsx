// A folder path whose parents fade and give way first, so the folder's own name stays readable.
export function FolderPath({ names, count }: { names: string[]; count?: number }) {
    const parent = names.slice(0, -1);
    const leaf = names[names.length - 1];

    return (
        <span className="flex min-w-0 whitespace-nowrap">
            {parent.length > 0 && (
                <>
                    <span className="min-w-0 shrink-4 truncate text-muted-foreground">{parent.join(" / ")}</span>
                    <span className="shrink-0 px-1 text-muted-foreground">/</span>
                </>
            )}
            <span className="min-w-0 truncate font-semibold text-primary">{leaf}</span>
            {count !== undefined && (
                <span className="shrink-0 pl-2 text-xs tabular-nums text-muted-foreground">{count}</span>
            )}
        </span>
    );
}
