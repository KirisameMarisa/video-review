import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { v4 as uuidv4 } from 'uuid';
import { Role } from "@/lib/role";
import { id } from "date-fns/locale";
import { JwtError, signToken } from "@/lib/jwt";
import bcrypt from "bcrypt";

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
 *               password:
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
        const { email, password } = await req.json();

        if (!email) {
            return apiError("missing email", 400);
        }

        if (!password) {
            return apiError("missing password", 400);
        }

        // ユーザーを探す（事前登録済みの管理者のみログイン可能）
        const identity = await prisma.identity.findUnique({
            where: {
                provider_providerUid: {
                    provider: "password",
                    providerUid: email,
                }
            },
            include: {
                user: true,
            }
        });

        if (!identity || !identity.secretHash) {
            return apiError("authentication failed", 401);
        }

        const isPasswordValid = await bcrypt.compare(password, identity.secretHash);
        if (!isPasswordValid) {
            return apiError("authentication failed", 401);
        }

        const role: Role = 'admin';
        let tokenPayload: Record<string, any> = {
            id: identity.user.id, displayName: identity.user.displayName, role
        };
        const token = signToken(tokenPayload);

        return NextResponse.json(
            {
                token,
                id: identity.user.id,
                email: email,
                displayName: identity.user.displayName,
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
