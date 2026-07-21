import type { VCSProvider, GetChangesParams } from "@/server/lib/vcs/provider";
import type { ChangeSet } from "@/server/lib/vcs/types";

type PerforceConfig = {
    serverUrl: string;
    user: string;
    token: string;
};

export class PerforceProvider implements VCSProvider {
    readonly name: string;

    constructor(private readonly config: PerforceConfig) {
        this.name = `perforce:${config.serverUrl}`;
    }

    getChanges(_params: GetChangesParams): Promise<ChangeSet> {
        throw new Error("Perforce provider is not yet implemented");
    }
}
