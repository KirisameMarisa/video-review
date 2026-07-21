import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/token", () => {
    return {
        verifyToken: vi.fn(),
    };
});

import { verifyRouter } from "@/server/routes/auth/verify";
import { verifyToken } from "@/server/lib/token";

describe("verifyRouter", () => {
    it("returns 200 when token is valid", async () => {
        vi.mocked(verifyToken).mockResolvedValueOnce({
            userId: "test-user-id",
            role: "admin",
        } as any);

        const res = await verifyRouter.request("http://localhost/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ token: "valid-token" }),
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            valid: true,
            decoded: {
                userId: "test-user-id",
                role: "admin",
            },
        });
    });

    it("returns 400 when token is missing", async () => {
        const res = await verifyRouter.request("http://localhost/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "missing token" });
    });
});
