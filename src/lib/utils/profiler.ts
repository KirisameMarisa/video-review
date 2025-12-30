export function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
};

export function logTime<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
}

export async function logAsyncTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
}

const now =
    (typeof globalThis !== 'undefined' && globalThis.performance && typeof globalThis.performance.now === 'function')
        ? () => globalThis.performance.now()
        : () => Date.now();

export class Profiler {
    private t0 = new Map<string, number>();
    private dt = new Map<string, number>();
    start(k: string) { this.t0.set(k, now()); }
    end(k: string) { this.dt.set(k, (this.dt.get(k) ?? 0) + (now() - (this.t0.get(k) ?? now()))); }
    add(k: string, v = 1) { this.dt.set(k, (this.dt.get(k) ?? 0) + v); }
    report(label = "profile") {
        const rows = [...this.dt.entries()].sort((a, b) => b[1] - a[1]);
        console.log(`\n=== ${label} ===`);
        for (const [k, v] of rows) console.log(`${k.padEnd(28)} ${v.toFixed(3)} ms`);
    }
}