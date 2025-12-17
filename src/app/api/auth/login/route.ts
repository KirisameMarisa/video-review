import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/auth/login:
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
 *               displayName:
 *                 type: string
 *               noJIRAAccount:
 *                 type: boolean
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
        const { email, displayName, noJIRAAccount } = await req.json();

        // 400
        if (!email) {
            return apiError("missing email", 400);
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return apiError("jwt configuration is missing", 500);
        }

        let resolvedDisplayName = displayName;
        let tokenPayload: Record<string, any> = { email };

        if (!noJIRAAccount) {
            try {
                const jira = await authenticateWithJira(email);
                resolvedDisplayName = jira.displayName;
                tokenPayload = {
                    ...tokenPayload,
                    ...jira.jira,
                };
            } catch {
                return apiError("failed to authenticate with jira", 401);
            }
        }

        const userDB = await upsertUser(email, resolvedDisplayName);

        const token = jwt.sign(tokenPayload, jwtSecret, {
            expiresIn: "1d",
        });

        return NextResponse.json(
            {
                token,
                id: userDB.id,
                displayName: resolvedDisplayName,
            },
            { status: 200 }
        );
    } catch {
        return apiError("failed to login", 500);
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

async function upsertUser(email: string, displayName: string) {
    return prisma.user.upsert({
        where: { email },
        update: { displayName },
        create: { email, displayName },
    });
}
