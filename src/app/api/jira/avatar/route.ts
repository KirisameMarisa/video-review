import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7日間

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
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
            // キャッシュ情報あるが画像が存在しない場合 → 再取得
        }
    }

    // 2. Jiraから最新のアバター情報取得
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL!;
    const token = process.env.JIRA_API_TOKEN!;

    const infoRes = await fetch(`${base}/rest/api/2/user/avatars?username=${email}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    if (!infoRes.ok) {
        return NextResponse.json({ error: "failed to fetch jira avatar info" }, { status: infoRes.status });
    }

    const info = await infoRes.json();
    const latest = info.custom?.find((a: any) => a.isSelected) ?? info.system?.find((a: any) => a.isSelected);

    if (!latest) {
        return NextResponse.json({ error: "no avatar found" }, { status: 404 });
    }

    const avatarUrl = `${base}/secure/useravatar?ownerId=${latest.owner}&avatarId=${latest.id}`;

    // 3. Jiraから画像を取得
    const imgRes = await fetch(avatarUrl, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!imgRes.ok) {
        return NextResponse.json({ error: "failed to fetch avatar image" }, { status: imgRes.status });
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // 4. uploads/avatars/ に保存
    const saveDir = path.join(process.cwd(), "uploads", "avatars");
    await fs.mkdir(saveDir, { recursive: true });
    const localPath = path.join(saveDir, `${email}.png`);
    await fs.writeFile(localPath, buffer);

    // 5. キャッシュDB更新
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

    // 6. 画像レスポンス
    return new NextResponse(buffer, {
        headers: {
            "Content-Type": imgRes.headers.get("content-type") ?? "image/png",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
