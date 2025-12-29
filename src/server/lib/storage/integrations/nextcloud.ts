import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { Readable } from "stream";
import "server-only"

const BaseURL = process.env.NEXTCLOUD_BASE_URL;
const UserName = process.env.NEXTCLOUD_USERNAME;
const Password = process.env.NEXTCLOUD_PASSWORD;
const RootPath = process.env.NEXTCLOUD_ROOTDIR;

export class NextCloudClient {
    readonly davBaseURL: string;
    readonly authHeader: string;
    readonly rootPath: string;

    constructor(baseURL: string, userName: string, password: string, rootPath: string = "video-review") {
        this.davBaseURL = `${baseURL}/remote.php/dav/files/${encodeURIComponent(userName)}`;
        const credentials = Buffer.from(`${userName}:${password}`).toString("base64");
        this.authHeader = `Basic ${credentials}`;
        this.rootPath = rootPath;
        this.createDirectory(rootPath).catch((err) => {
            console.error("Failed to ensure root dir:", err);
        });
    }

    public async createDirectory(path: string): Promise<void> {
        const url = `${this.davBaseURL}/${path}`;
        const res = await fetch(url, {
            method: "MKCOL",
            headers: this.getHeaders(),
        });

        // 201: created
        // 405: already exists
        if (res.status === 201 || res.status === 405) {
            return;
        }

        throw new Error(
            `Failed to ensure root dir (${path}): ${res.status}`
        );
    }

    public getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
        return {
            "Authorization": this.authHeader,
            ...extraHeaders
        };
    }

    public async hasObject(path: string): Promise<boolean> {
        const res = await fetch(this.pathUnderRoot(path), {
            method: "GET",
            headers: this.getHeaders(),
        });
        return res.status === 200;
    }

    public async put(path: string, stream: Readable) {
        const pathWithRoot = `${this.rootPath}/${path}`;
        let pathSegments = pathWithRoot.split("/");
        for(let i = 0; i < pathSegments.length - 1; i++) {
            const dirPath = pathSegments.slice(0, i + 1).join("/");
            await this.createDirectory(dirPath);
        }
        
        const url = this.pathUnderRoot(path);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const res = await fetch(url, {
            method: "PUT",
            headers: this.getHeaders(),
            body: buffer,
        });

        if (!res.ok) {
            throw new Error(`PUT failed: ${res.status}`);
        }
    }

    public async download(path: string): Promise<NextResponse> {
        const res = await fetch(this.pathUnderRoot(path), {
            headers: this.getHeaders(),
        });

        return new NextResponse(res.body, {
            status: res.status,
            headers: {
                "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
            },
        });
    }

    public pathUnderRoot(path: string): string {
        return `${this.davBaseURL}/${this.rootPath}/${path}`;
    }
}


const nextCloud = () => {
    if (!BaseURL || !UserName || !Password) {
        return null;
    }

    const client = new NextCloudClient(BaseURL, UserName, Password, RootPath);
    return client;
}

export const nextCloudClient = nextCloud();