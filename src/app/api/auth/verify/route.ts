import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { apiError } from "@/lib/api-response";

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify JWT token
 *     description: Verifies a JWT token and returns decoded payload if valid.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 decoded:
 *                   type: object
 *       400:
 *         description: Missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to verify token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        // 400
        if (!token) {
            return apiError("missing token", 400);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return apiError("jwt configuration is missing", 500);
        }

        try {
            const decoded = jwt.verify(token, secret);
            return NextResponse.json(
                { valid: true, decoded },
                { status: 200 }
            );
        } catch {
            return apiError("invalid token", 401);
        }
    } catch {
        return apiError("failed to verify token", 500);
    }
}
