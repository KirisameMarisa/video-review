import { Role } from "@/lib/role";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import { env } from "@/server/lib/env";
import "server-only"
import { hash } from "crypto";

type SecretKey = {
    dbKey: string;
    envKey: string | undefined;
};

export const Secrets = {
    JWT: { dbKey: "JWT_SECRET", envKey: env.JWT_SECRET_deprecated },
    API: { dbKey: "API_TOKEN", envKey: env.VIDEO_REVIEW_API_TOKEN },
} as const;

const cache = new Map<string, string>();


async function loadFromDb(name: string) {
    const token = await prisma.systemSecret.findUnique({
        where: { key: name },
    });
    return token?.valueHash;
}

export async function getSecret({ dbKey, envKey }: SecretKey): Promise<string | undefined> {
    const cached = cache.get(dbKey);
    if (cached) return cached;

    const fromDb = await loadFromDb(dbKey);
    if (fromDb) {
        cache.set(dbKey, fromDb);
        return fromDb;
    }

    const fromEnv = envKey;
    if (!fromEnv) {
        throw undefined;
    }

    cache.set(dbKey, fromEnv);
    return fromEnv;
}

export const getJwtSecret = () => getSecret(Secrets.JWT);

export const getApiSecretHash = () => getSecret(Secrets.API);

export async function verifyToken(token: string): Promise<JwtPayload> {
    const secret = await getJwtSecret();
    if (!secret) {
        throw new ServerError("jwt configuration is missing", 500);
    }

    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string") {
        throw new ServerError("invalid token payload", 401);
    }

    return decoded;
}

export async function signToken(payload: Record<string, any>): Promise<string> {
    const secret = await getJwtSecret();
    if (!secret) {
        throw new ServerError("jwt configuration is missing", 500);
    }
    return jwt.sign(payload, secret, { expiresIn: "1d" });
}

export async function authorize(req: Request, passedRoles: Role[]) {
    // NOTE:
    // x-api-token (VIDEO_REVIEW_API_TOKEN) is the primary authentication method.
    // x-maintenance-token is kept temporarily for backward compatibility.
    const apiToken = req.headers.get("x-api-token");
    const maintenanceToken = req.headers.get("x-maintenance-token");

    if (apiToken) {
        const apiTokenHash = hash("sha256", apiToken);
        const storedHash = await getApiSecretHash();

        if (!storedHash) {
            throw new ServerError("api token configuration is missing", 500);
        }

        // Standard root.
        if (apiTokenHash === storedHash) {
            return {
                type: "api-token" as const,
                role: "admin",
            };
        }

        // deprecated plain text root.
        if (apiToken === storedHash) {
            return {
                type: "api-token" as const,
                role: "admin",
            };
        }
    }

    if (
        maintenanceToken &&
        maintenanceToken === env.VIDEO_REVIEW_ADMIN_MAINTENANCE_TOKEN_deprecated
    ) {
        return {
            type: "api-token" as const,
            role: "admin",
        };
    }

    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            throw new ServerError("missing authorization header", 500);
        }

        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            throw new ServerError("invalid authorization format", 401);
        }

        const decoded = await verifyToken(token);
        if (typeof decoded === "string") {
            throw new ServerError("invalid token", 401);
        }

        if (!passedRoles.includes(decoded.role)) {
            throw new ServerError("forbidden", 403);
        }
        return {
            type: "jwt" as const,
            decoded,
        };
    } catch {
        throw new ServerError("unauthorized", 401);
    }
}

