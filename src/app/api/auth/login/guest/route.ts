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
 * /api/auth/login/guest:
 *   post:
 *     summary: Login guest user and issue JWT
 *     description: >
 *       Logs in a user and returns a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               displayName:
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
        const { displayName } = await req.json();

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return apiError("jwt configuration is missing", 500);
        }

        if(!displayName) {
            return apiError("missing displayName", 400);
        }

        let role: Role = 'guest';
        let tokenPayload: Record<string, any> = {
            id: uuidv4(), displayName, role
        };
        const token = signToken(tokenPayload);

        return NextResponse.json(
            {
                token,
                id: tokenPayload.id,
                email: null,
                displayName: displayName,
                role,
            },
            { status: 200 }
        );
    } catch(e) {
        if (e instanceof JwtError) {
            return apiError(e.message, e.status);
        } else {
            return apiError("failed to login", 500);
        }
    }
}
