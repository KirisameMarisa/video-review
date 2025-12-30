import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/db";
import { Hono } from "hono";
import path from "path";
import fs from "fs";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7日間

export const avatarRouter = new Hono();

avatarRouter.get('/', async (c) => {
    try {
        const { searchParams } = new URL(c.req.url);
        const email = searchParams.get("email");

        // 400
        if (!email) {
            return c.json({ error: "email is required" }, 400);
        }

        // 1. キャッシュ確認
        const cached = await prisma.jiraAvatarCache.findUnique({ where: { email } });
        const now = Date.now();

        if (cached && now - new Date(cached.cachedAt).getTime() < CACHE_TTL_MS) {
            const localPath = path.join(process.cwd(), "uploads", "avatars", `${email}.png`);
            try {
                const img = Buffer.from(await fs.promises.readFile(localPath));
                return new NextResponse(img, {
                    headers: {
                        "Content-Type": "image/png",
                        "Cache-Control": "public, max-age=86400",
                    },
                });
            } catch {
                // キャッシュ不整合 → 再取得
            }
        }

        // 2. Jira設定チェック
        const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL;
        const token = process.env.JIRA_API_TOKEN;

        if (!base || !token) {
            return c.json({ error: "jira configuration is missing" }, 500);
        }

        // 3. Jiraから最新のアバター情報取得
        const infoRes = await fetch(
            `${base}/rest/api/2/user/avatars?username=${email}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        if (!infoRes.ok) {
            return c.json({ error: "failed to fetch jira avatar info" }, 500);
        }

        const info = await infoRes.json();
        const latest =
            info.custom?.find((a: any) => a.isSelected) ??
            info.system?.find((a: any) => a.isSelected);

        // 404
        if (!latest || !latest.owner) {
            return c.json({ error: "no avatar found" }, 404);
        }

        const avatarUrl = `${base}/secure/useravatar?ownerId=${latest.owner}&avatarId=${latest.id}`;

        // 4. Jiraから画像取得
        const imgRes = await fetch(avatarUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!imgRes.ok) {
            return c.json({ error: "failed to fetch jira avatar" }, 500);
        }

        const buffer = Buffer.from(await imgRes.arrayBuffer());

        // 5. 保存
        const saveDir = path.join(process.cwd(), "uploads", "avatars");
        await fs.promises.mkdir(saveDir, { recursive: true });
        const localPath = path.join(saveDir, `${email}.png`);
        await fs.promises.writeFile(localPath, buffer);

        // 6. キャッシュDB更新
        await prisma.jiraAvatarCache.upsert({
            where: { email },
            update: {
                ownerId: latest.owner,
                avatarId: latest.id,
                avatarUrl,
                cachedAt: new Date(),
            },
            create: {
                email,
                ownerId: latest.owner,
                avatarId: latest.id,
                avatarUrl,
            },
        });

        // 7. レスポンス
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": imgRes.headers.get("content-type") ?? "image/png",
                "Cache-Control": "public, max-age=86400",
            },
        });

    } catch {
        return c.json({ error: "failed to fetch jira avatar" }, 500);
    }
});