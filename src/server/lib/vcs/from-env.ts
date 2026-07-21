import { env } from "@/server/lib/env";
import { createVCSProvider } from "@/server/lib/vcs/factory";
import type { VCSProvider } from "@/server/lib/vcs/provider";

export function createVCSProviderFromEnv(): VCSProvider | null {
    const provider = env.VCS_PROVIDER;
    if (!provider) return null;

    switch (provider) {
        case "github": {
            const owner = env.VCS_GITHUB_OWNER;
            const repo = env.VCS_GITHUB_REPO;
            const token = env.VCS_GITHUB_TOKEN;
            if (!owner || !repo || !token) {
                throw new Error(
                    "VIDEO_REVIEW_VCS_GITHUB_OWNER, _REPO, and _TOKEN are required for the GitHub VCS provider"
                );
            }
            return createVCSProvider({ provider: "github", owner, repo, token, branch: env.VCS_BRANCH });
        }
        default:
            throw new Error(`VCS provider "${provider}" is not yet implemented via env config`);
    }
}
