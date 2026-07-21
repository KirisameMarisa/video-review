import { env } from "@/lib/env";

export function createVideoCommentLink(baseURL: string, videoId: string | null, commentId: string | null): string | null {
    if (videoId === null) {
        return null;
    }
    if (commentId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?comment=${commentId}`
}

export function createVideoTimeLink(baseURL: string, videoId: string | null, time: number): string | null {
    if (videoId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?t=${time}`
}

export function createOpenSceneLink(scenePath: string): string | null {
    const template = env.PUBLIC_VIDEO_REVIEW_URL_SCHEMA;
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

export function createVideoEventLink(baseURL: string, videoId: string | null, videoRevId: string | null, eventId: string | null): string | null {
    if (videoId === null || videoRevId === null || eventId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?revision=${videoRevId}&event=${eventId}`;
}
