import type { VCSProvider, GetChangesParams } from "@/server/lib/vcs/provider";
import type { ChangeSet } from "@/server/lib/vcs/types";

type SVNConfig = {
    repoUrl: string;
    username?: string;
    password?: string;
};

export class SVNProvider implements VCSProvider {
    readonly name: string;

    constructor(private readonly config: SVNConfig) {
        this.name = `svn:${config.repoUrl}`;
    }

    getChanges(_params: GetChangesParams): Promise<ChangeSet> {
        throw new Error("SVN provider is not yet implemented");
    }
}
