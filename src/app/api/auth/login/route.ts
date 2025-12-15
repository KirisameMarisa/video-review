import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const { email, displayName, noJIRAAccount } = await req.json();

    let resolvedDisplayName = displayName;
    let tokenPayload: Record<string, any> = { email };

    if (!noJIRAAccount) {
        const jira = await authenticateWithJira(email);
        resolvedDisplayName = jira.displayName;
        tokenPayload = {
            ...tokenPayload,
            ...jira.jira,
        };
    }

    const userDB = await upsertUser(email, resolvedDisplayName);
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
        expiresIn: "1d",
    });

    return NextResponse.json({
        token,
        id: userDB.id,
        displayName: resolvedDisplayName,
    });
}

async function authenticateWithJira(email: string) {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL!;
    const res = await fetch(
        `${base}/rest/api/2/user/search?username=${email}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.JIRA_API_TOKEN!}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        },
    );

    if (!res.ok) throw new Error("Cannot get Jira info");

    const users = await res.json();
    if (!users?.length) throw new Error("User not found in Jira");

    const user = users[0];
    return {
        displayName: user.displayName || email,
        jira: {
            userKey: user.key,
            accountId: user.accountId,
        },
    };
}

async function upsertUser(email: string, displayName: string) {
    return prisma.user.upsert({
        where: { email },
        update: { displayName },
        create: { email, displayName },
    });
}
