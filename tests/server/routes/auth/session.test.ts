import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyTokenMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/token", () => ({ AUTH_COOKIE: "video_review_token", verifyToken: verifyTokenMock }));
vi.mock("@/server/lib/db", () => ({ prisma: { user: { findUnique: findUniqueMock } } }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { sessionRouter } from "@/server/routes/auth/session";
import { handleServerError } from "@/server/lib/server-error";

const app = new OpenAPIHono().route("/session", sessionRouter);
app.onError(handleServerError);

describe("GET /auth/session", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        verifyTokenMock.mockResolvedValue({ id: "user-1", displayName: "Alice", role: "viewer", provider: "oidc", iat: 1, exp: 2 });
        findUniqueMock.mockResolvedValue({ email: "alice@example.com" });
    });

    it("answers 401 without the cookie", async () => {
        const res = await app.request("/session");

        expect(res.status).toBe(401);
        expect(verifyTokenMock).not.toHaveBeenCalled();
    });

    it("answers 401 for a cookie that does not verify", async () => {
        verifyTokenMock.mockRejectedValue(new Error("jwt expired"));

        const res = await app.request("/session", { headers: { cookie: "video_review_token=stale" } });

        expect(res.status).toBe(401);
    });

    it("hands the cookie's session over in the shape of a login response", async () => {
        const res = await app.request("/session", { headers: { cookie: "video_review_token=jwt" } });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ id: "user-1", displayName: "Alice", role: "viewer", provider: "oidc", token: "jwt", email: "alice@example.com" });
    });
});
