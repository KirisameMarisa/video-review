export const isInvalidDate = (date: Date | undefined) => date === undefined || Number.isNaN(date.getTime());

export const toDateOnly = (d:Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const toDateRange = (from: Date | undefined, to: Date | undefined) => {
    if(isInvalidDate(from) || isInvalidDate(to)) return { from: undefined, to: undefined}

    const start = toDateOnly(from!);
    start.setHours(0, 0, 0, 0);
    const end = toDateOnly(to!);
    end.setHours(23, 59, 59, 999);

    return {from: start, to: end}
}
