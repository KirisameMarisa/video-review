import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { v4 as uuidv4 } from 'uuid';
import { Role } from "@/lib/role";
import { id } from "date-fns/locale";
import { JwtError, signToken } from "@/lib/jwt";

/**
 * @swagger
 * /api/auth/login/jira:
 *   post:
 *     summary: Login user and issue JWT
 *     description: >
 *       Logs in a user and returns a JWT token.
 *       If the user has a JIRA account, user information is fetched from JIRA.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login succeeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 id:
 *                   type: string
 *                 displayName:
 *                   type: string
 *                 email:
 *                   type: string
 *                   nullable: true
 *                 role:
 *                   type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return apiError("missing email", 400);
        }

        // 1. JIRA 認証
        let jiraInfo;
        try {
            jiraInfo = await authenticateWithJira(email);
        } catch {
            return apiError("failed to authenticate with jira", 401);
        }

        // 2. User upsert
        const userDB = await upsertUser(
            email,
            jiraInfo.displayName
        );

        // 3. Identity upsert
        await upsertJiraIdentity(
            userDB.id,
            jiraInfo.jira.accountId
        );

        const role: Role = 'viewer';
        let tokenPayload: Record<string, any> = {
            id: userDB.id, displayName: userDB.displayName, role
        };
        const token = signToken(tokenPayload);

        return NextResponse.json(
            {
                token,
                id: userDB.id,
                email: email,
                displayName: userDB.displayName,
                role,
            },
            { status: 200 }
        );
    } catch (e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        } else {
            return apiError("failed to login", 500);
        }
    }
}

async function authenticateWithJira(email: string) {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL!;
    const res = await fetch(`${base}/rest/api/2/user/search?username=${email}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.JIRA_API_TOKEN!}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

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

async function upsertJiraIdentity(userId: string, accountId: string) {
    return prisma.identity.upsert({
        where: {
            provider_providerUid: {
                provider: 'jira',
                providerUid: accountId,
            }
        },
        update: { userId },
        create: {
            userId,
            provider: 'jira',
            providerUid: accountId,
        },
    });
}

async function upsertUser(email: string, displayName: string) {
    return prisma.user.upsert({
        where: { email },
        update: { displayName },
        create: { email, displayName },
    });
}
