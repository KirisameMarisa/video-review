import { VideoComment } from '@/lib/db-types';

export function getBaseUrl(req?: Request) {
    if (typeof window !== "undefined") return window.location.origin;
    if (req?.headers.get("host")) return `https://${req.headers.get("host")}`;
    return process.env.NEXT_PUBLIC_APP_BASE_URL ?? "";
}

export function createVideoCommentLink(videoId: string | null, comment: VideoComment): string | null {
    if (videoId === null) {
        return null;
    }
    const baseURL = window.location.origin
    return `${baseURL}/video-review/review/${videoId}?comment=${comment?.id}`
}

export function createVideoTimeLink(videoId: string | null, time: number): string | null {
    if (videoId === null) {
        return null;
    }
    const baseURL = window.location.origin
    return `${baseURL}/video-review/review/${videoId}?t=${time}`
}

export function createOpenSceneLink(scenePath: string): string | null {
    const template = process.env.NEXT_PUBLIC_URL_SCHEMA;
    if (!template) {
        return null;
    }
    if (template.includes("{scenePath}")) {
        return template.replace("{scenePath}", scenePath);
    }
    const sep = template.endsWith("/") ? "" : "/";
    return `${template}${sep}${scenePath}`;
}

export function OpenScene(scenePath: string): void {
    const link = createOpenSceneLink(scenePath);
    if (!link) {
        return;
    }
    window.location.href = link;
}
