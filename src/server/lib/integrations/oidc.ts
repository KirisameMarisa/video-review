import "server-only";
import { z } from "@hono/zod-openapi";
import { defineIntegration, HttpUrlSchema, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig } from "@/server/lib/integrations/store";

// The endpoints the identity provider publishes under its issuer.
const DiscoverySchema = z.object({
    authorization_endpoint: z.string().url(),
    token_endpoint: z.string().url(),
    userinfo_endpoint: z.string().url(),
});
export type OidcDiscovery = z.infer<typeof DiscoverySchema>;

const TokenErrorSchema = z.object({ error: z.string() });

export const oidc = defineIntegration({
    name: "oidc",
    fields: {
        issuer: { kind: "destination", env: () => undefined, schema: HttpUrlSchema },
        clientId: { kind: "plain", env: () => undefined },
        clientSecret: { kind: "secret", env: () => undefined },
    },
    testSchema: TestResultSchema,
    check: () => true,
    canTest: ({ issuer, clientId, clientSecret }) => !!issuer && !!clientId && !!clientSecret,
    // Checks the client without a user: a made-up code is rejected as invalid_grant once the client is accepted.
    test: async ({ issuer, clientId, clientSecret }) => {
        let discovery: OidcDiscovery;
        try {
            discovery = await discover(issuer!);
        } catch {
            return { ok: false, error: "the issuer did not answer with an OpenID configuration" };
        }

        let res: Response;
        try {
            res = await fetch(discovery.token_endpoint, {
                method: "POST",
                headers: { ...clientAuthorization(clientId!, clientSecret!), "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
                body: new URLSearchParams({ grant_type: "authorization_code", code: "probe" }),
                signal: AbortSignal.timeout(10_000),
            });
        } catch {
            return { ok: false, error: "the identity provider could not be reached" };
        }

        let error: string;
        try {
            error = TokenErrorSchema.parse(await res.json()).error;
        } catch {
            return { ok: false, error: "the identity provider sent an unexpected response" };
        }

        if (error === "invalid_client" || error === "unauthorized_client") {
            return { ok: false, error: "the identity provider does not accept this client id and secret" };
        }
        if (error !== "invalid_grant") {
            return { ok: false, error: `the identity provider answered ${error}` };
        }
        return { ok: true };
    },
});

export const getOidcConfig = () => getConfig(oidc);

// client_secret_basic, the one method every provider must accept.
export function clientAuthorization(clientId: string, clientSecret: string) {
    return { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` };
}

export async function discover(issuer: string): Promise<OidcDiscovery> {
    const res = await fetch(`${issuer}/.well-known/openid-configuration`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
    });
    return DiscoverySchema.parse(await res.json());
}
