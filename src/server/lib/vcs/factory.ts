import type { VCSProvider } from "@/server/lib/vcs/provider";
import { GitHubProvider } from "@/server/lib/vcs/providers/github";
import { GitLabProvider } from "@/server/lib/vcs/providers/gitlab";
import { SVNProvider } from "@/server/lib/vcs/providers/svn";
import { PerforceProvider } from "@/server/lib/vcs/providers/perforce";

export type VCSProviderConfig =
    | { provider: "github";   owner: string; repo: string; token: string; branch?: string }
    | { provider: "gitlab";   projectId: string; token: string; branch?: string }
    | { provider: "svn";      repoUrl: string; username?: string; password?: string }
    | { provider: "perforce"; serverUrl: string; user: string; token: string };

export function createVCSProvider(config: VCSProviderConfig): VCSProvider {
    switch (config.provider) {
        case "github":   return new GitHubProvider(config);
        case "gitlab":   return new GitLabProvider(config);
        case "svn":      return new SVNProvider(config);
        case "perforce": return new PerforceProvider(config);
    }
}
