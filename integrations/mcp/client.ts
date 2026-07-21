export interface VideoReviewClient {
    get<T = unknown>(path: string, params?: Record<string, string | undefined>): Promise<T>;
}

export function createClient(config: { baseUrl: string; apiToken: string }): VideoReviewClient {
    const { baseUrl, apiToken } = config;

    return {
        async get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
            const url = new URL(`/api/v1${path}`, baseUrl);
            if (params) {
                for (const [key, value] of Object.entries(params)) {
                    if (value !== undefined) url.searchParams.set(key, value);
                }
            }
            const res = await fetch(url.toString(), {
                headers: { "x-api-token": apiToken },
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }
            return res.json() as Promise<T>;
        },
    };
}
