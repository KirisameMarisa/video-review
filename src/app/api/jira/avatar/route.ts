import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7日間

/**
 * @swagger
 * /api/jira/avatar:
 *   get:
 *     summary: Get JIRA user avatar
 *     description: >
 *       Fetches a JIRA user's avatar by email.
 *       Uses cached image if available and valid; otherwise fetches from JIRA and caches it.
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: User email
 *     responses:
 *       200:
 *         description: Avatar image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing email parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: Avatar not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to fetch avatar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        // 400
        if (!email) {
            return apiError("email is required", 400);
        }

        // 1. キャッシュ確認
        const cached = await prisma.jiraAvatarCache.findUnique({ where: { email } });
        const now = Date.now();

        if (cached && now - new Date(cached.cachedAt).getTime() < CACHE_TTL_MS) {
            const localPath = path.join(process.cwd(), "uploads", "avatars", `${email}.png`);
            try {
                const img = Buffer.from(await fs.readFile(localPath));
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
            return apiError("jira configuration is missing", 500);
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
            return apiError("failed to fetch jira avatar info", 500);
        }

        const info = await infoRes.json();
        const latest =
            info.custom?.find((a: any) => a.isSelected) ??
            info.system?.find((a: any) => a.isSelected);

        // 404
        if (!latest) {
            return apiError("no avatar found", 404);
        }

        const avatarUrl = `${base}/secure/useravatar?ownerId=${latest.owner}&avatarId=${latest.id}`;

        // 4. Jiraから画像取得
        const imgRes = await fetch(avatarUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!imgRes.ok) {
            return apiError("failed to fetch avatar image", 500);
        }

        const buffer = Buffer.from(await imgRes.arrayBuffer());

        // 5. 保存
        const saveDir = path.join(process.cwd(), "uploads", "avatars");
        await fs.mkdir(saveDir, { recursive: true });
        const localPath = path.join(saveDir, `${email}.png`);
        await fs.writeFile(localPath, buffer);

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
        return apiError("failed to fetch jira avatar", 500);
    }
}
