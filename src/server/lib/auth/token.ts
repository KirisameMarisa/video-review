import { Role } from "@/lib/role";
import jwt, { JwtPayload } from "jsonwebtoken";

import "server-only"

export class JwtError extends Error {
    status: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "JwtError";
        this.status = statusCode;
        this.message = message;
    }
}

export function verifyToken(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new JwtError("jwt configuration is missing", 500);
    }

    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string") {
        throw new JwtError("invalid token payload", 401);
    }

    return decoded;
}

export function signToken(payload: Record<string, any>): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new JwtError("jwt configuration is missing", 500);
    }

    return jwt.sign(payload, secret, { expiresIn: "1d" });
}

export function authorize(req: Request, passedRoles: Role[]) {
    const apiToken = req.headers.get("x-api-token");
    if (
        apiToken &&
        apiToken === process.env.VIDEO_REVIEW_API_TOKEN
    ) {
        return {
            type: "api-token" as const,
            role: "admin",
        };
    }

    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            throw new JwtError("missing authorization header", 500);
        }

        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            throw new JwtError("invalid authorization format", 401);
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string") {
            throw new JwtError("invalid token", 401);
        }

        if (!passedRoles.includes(decoded.role)) {
            throw new JwtError("forbidden", 403);
        }
        return {
            type: "jwt" as const,
            decoded,
        };
    } catch {
        throw new JwtError("unauthorized", 401);
    }
}
