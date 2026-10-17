import { beforeEach, describe, expect, it, vi } from "vitest";

// The sign-in itself is a mock; what is checked is how the callback answers the browser for each thing it returns.
const oauthMock = vi.hoisted(() => ({
    oauthProviderNames: ["oidc"],
    startOAuthLogin: vi.fn(),
    finishOAuthLogin: vi.fn(),
}));

vi.mock("@/server/lib/login/oauth", () => oauthMock);

import { oauthRouter } from "@/server/routes/auth/oauth";
import { ServerError } from "@/server/lib/server-error";

const STATE = "a".repeat(64);
const VERIFIER = "v".repeat(43);

function callback(query: Record<string, string>, cookieState = STATE) {
    const url = new URL("http://localhost/oidc/callback");
    url.search = new URLSearchParams(query).toString();
    return oauthRouter.request(url, {
        headers: { cookie: `video_review_oauth_state=${cookieState}; video_review_oauth_verifier=${VERIFIER}` },
    });
}

describe("GET /auth/oauth/oidc/callback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // The route logs the cause of a failed sign-in; keep it out of the test output.
        vi.spyOn(console, "error").mockImplementation(() => {});
        oauthMock.finishOAuthLogin.mockResolvedValue({ token: "jwt", id: "user-1", role: "viewer", displayName: "Alice", provider: "oidc" });
    });

    it("does not sign in when the state is not the one this browser was sent with, and drops both cookies", async () => {
        const res = await callback({ code: "good-code", state: "b".repeat(64) });

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=failed");
        expect(oauthMock.finishOAuthLogin).not.toHaveBeenCalled();
        const dropped = res.headers.getSetCookie().filter(c => c.includes("Max-Age=0"));
        expect(dropped.some(c => c.startsWith("video_review_oauth_state="))).toBe(true);
        expect(dropped.some(c => c.startsWith("video_review_oauth_verifier="))).toBe(true);
    });

    it("sends a disabled user back with the disabled error", async () => {
        oauthMock.finishOAuthLogin.mockRejectedValue(new ServerError("user disabled", 403));

        const res = await callback({ code: "good-code", state: STATE });

        expect(res.headers.get("location")).toBe("/login?error=disabled");
    });

    it("hands the code and the verifier to the provider, sets the auth cookie and hands over to the login screen", async () => {
        const res = await callback({ code: "good-code", state: STATE });

        expect(oauthMock.finishOAuthLogin).toHaveBeenCalledWith("oidc", expect.objectContaining({
            code: "good-code",
            codeVerifier: VERIFIER,
            redirectUri: "http://localhost/api/v1/auth/oauth/oidc/callback",
        }));
        expect(res.headers.get("set-cookie")).toContain("video_review_token=jwt");
        expect(res.headers.get("location")).toBe("/login?session=1");
    });
});

describe("GET /auth/oauth/oidc/start", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("sends the browser to the provider with the state and the PKCE challenge, and keeps both in cookies", async () => {
        oauthMock.startOAuthLogin.mockResolvedValue("https://idp.example/auth?x=1");

        const res = await oauthRouter.request("http://localhost/oidc/start");

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("https://idp.example/auth?x=1");
        const { state, codeChallenge, redirectUri } = oauthMock.startOAuthLogin.mock.calls[0][1];
        expect(redirectUri).toBe("http://localhost/api/v1/auth/oauth/oidc/callback");
        expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
        const cookies = res.headers.getSetCookie();
        expect(cookies.some(c => c.startsWith(`video_review_oauth_state=${state};`) && c.includes("HttpOnly"))).toBe(true);
        expect(cookies.some(c => c.startsWith("video_review_oauth_verifier=") && c.includes("HttpOnly"))).toBe(true);
    });

    it("sends the browser to the login screen's error, with no cookies, when the provider cannot be started", async () => {
        oauthMock.startOAuthLogin.mockRejectedValue(new ServerError("sso login is not configured", 401));

        const res = await oauthRouter.request("http://localhost/oidc/start");

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=failed");
        expect(res.headers.getSetCookie()).toEqual([]);
    });
});
