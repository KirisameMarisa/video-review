import type { VCSProvider, GetChangesParams } from "@/server/lib/vcs/provider";
import type { ChangeSet } from "@/server/lib/vcs/types";

type GitLabConfig = {
    projectId: string;
    token: string;
    branch?: string;
};

export class GitLabProvider implements VCSProvider {
    readonly name: string;

    constructor(private readonly config: GitLabConfig) {
        this.name = `gitlab:${config.projectId}`;
    }

    getChanges(_params: GetChangesParams): Promise<ChangeSet> {
        throw new Error("GitLab provider is not yet implemented");
    }
}
