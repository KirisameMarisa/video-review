import "server-only";

type HeadersLike = HeadersInit | undefined;

function headersToObject(headers: HeadersLike): Record<string, string> {
    const obj: Record<string, string> = {};
    if (!headers) return obj;

    if (headers instanceof Headers) {
        headers.forEach((v, k) => (obj[k] = v));
        return obj;
    }

    if (Array.isArray(headers)) {
        for (const [k, v] of headers) obj[String(k)] = String(v);
        return obj;
    }

    for (const [k, v] of Object.entries(headers)) obj[k] = String(v);
    return obj;
}

async function safeReadBodyText(res: Response): Promise<string> {
    try {
        return await res.clone().text();
    } catch (e) {
        return `(failed to read body: ${String(e)})`;
    }
}

function bodySummary(body: any): string {
    if (body == null) return "null/undefined";
    if (typeof body === "string") return `string(len=${body.length})`;
    if (body instanceof URLSearchParams) return `URLSearchParams(${body.toString()})`;
    if (body instanceof Blob) return `Blob(size=${body.size}, type=${body.type || "?"})`;
    if (typeof body === "object" && typeof body.pipe === "function") return "Readable(stream)";
    return `unknown(${Object.prototype.toString.call(body)})`;
}

export async function fetchWithDump(
    label: string,
    url: string,
    init: RequestInit
): Promise<Response> {
    const reqHeadersObj = headersToObject(init.headers);

    console.log(`\n[${label}] ===== REQUEST =====`);
    console.log(`[${label}] url:`, url);
    console.log(`[${label}] method:`, init.method ?? "GET");
    console.log(`[${label}] headers:`, reqHeadersObj);
    console.log(`[${label}] body:`, bodySummary(init.body as any));

    try {
        const req = new Request(url, init);
        const finalHeaders: Record<string, string> = {};
        req.headers.forEach((v, k) => (finalHeaders[k] = v));
        console.log(`[${label}] final headers (Request):`, finalHeaders);
    } catch (e) {
        console.log(`[${label}] failed to build Request for final headers:`, String(e));
    }

    const res = await fetch(url, init);

    const resHeadersObj: Record<string, string> = {};
    res.headers.forEach((v, k) => (resHeadersObj[k] = v));

    console.log(`\n[${label}] ===== RESPONSE =====`);
    console.log(`[${label}] status:`, res.status, res.statusText);
    console.log(`[${label}] headers:`, resHeadersObj);

    const text = await safeReadBodyText(res);
    console.log(`[${label}] body (head 1000):`, text.slice(0, 1000));

    return res;
}
