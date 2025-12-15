import { PrismaClient, VideoComment } from "@prisma/client";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

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

export function formatElapsed(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // ゼロ埋め（2桁表示）
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${mm}:${ss}`;
}

export function formatDate(date: Date): string {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function captureFrame(video: HTMLVideoElement | null): Promise<Blob | null> {
    return new Promise((resolve) => {
        if (video === null) return resolve(null);

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/png");
    });
}


export function findFirstWithinEps(arr: number[], target: number, eps: number): number | null {
    let lo = 0, hi = arr.length - 1;

    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= target) lo = mid + 1;
        else hi = mid - 1;
    }

    const candidates = [hi, hi + 1];
    for (const i of candidates) {
        if (i >= 0 && i < arr.length) {
            if (Math.abs(arr[i] - target) <= eps) return i;
        }
    }

    return null;
}