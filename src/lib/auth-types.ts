import { Role } from "@/lib/role";

// How the current session authenticated. One vocabulary across the DB Identity.provider,
// the JWT `provider` claim, and the login routes.
export type LoginType = "guest" | "jira" | "password" | "oidc";

export const MIN_PASSWORD_LENGTH = 6;

// Registered at the identity provider as the redirect URL; shown on the admin screen and used by the callback route.
export const OIDC_CALLBACK_PATH = "/api/v1/auth/oauth/oidc/callback";

export interface LoginRequest {
    displayName: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    id: string;
    email?: string;
    displayName: string;
    role: Role
    provider: LoginType
}