import "server-only";
import { z } from "@hono/zod-openapi";
import { ServerError } from "@/server/lib/server-error";
import { clientAuthorization, discover, getOidcConfig } from "@/server/lib/integrations/oidc";
import { loginOidcUser } from "@/server/lib/login/oidc";
import type { OAuthProvider } from "@/server/lib/login/oauth";

const TokenSchema = z.object({ access_token: z.string() });

// The identity provider's answer to "who is this?".
const UserInfoSchema = z.object({
    sub: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    preferred_username: z.string().optional(),
});

async function client() {
    const { issuer, clientId, clientSecret } = await getOidcConfig();
    if (!issuer || !clientId || !clientSecret) {
        throw new ServerError("sso login is not configured", 401);
    }
    return { issuer, clientId, clientSecret };
}

// Any OpenID Connect provider; the token is used once, to ask who signed in.
export const oidcProvider: OAuthProvider = {
    async isConfigured() {
        const { issuer, clientId, clientSecret } = await getOidcConfig();
        return !!issuer && !!clientId && !!clientSecret;
    },

    async authorizeUrl({ redirectUri, state, codeChallenge }) {
        const { issuer, clientId } = await client();
        const { authorization_endpoint } = await discover(issuer);
        const url = new URL(authorization_endpoint);
        url.search = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid email profile",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        }).toString();
        return url.toString();
    },

    async login({ code, redirectUri, codeVerifier }) {
        const { issuer, clientId, clientSecret } = await client();
        const { token_endpoint, userinfo_endpoint } = await discover(issuer);

        const tokenRes = await fetch(token_endpoint, {
            method: "POST",
            headers: { ...clientAuthorization(clientId, clientSecret), "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!tokenRes.ok) {
            throw new ServerError("the identity provider did not accept the login", 401);
        }
        const { access_token } = TokenSchema.parse(await tokenRes.json());

        const meRes = await fetch(userinfo_endpoint, {
            headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
            signal: AbortSignal.timeout(10_000),
        });
        if (!meRes.ok) {
            throw new ServerError("the identity provider did not say who signed in", 401);
        }
        const me = UserInfoSchema.parse(await meRes.json());
        if (!me.email) {
            throw new ServerError("the identity provider sent no email", 401);
        }

        return loginOidcUser({ sub: me.sub, email: me.email, displayName: me.name || me.preferred_username || me.email });
    },
};
