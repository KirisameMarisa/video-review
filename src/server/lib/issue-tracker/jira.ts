import { getJiraConfig, type JiraDeployment, jiraDeployment, jiraAuthorization, searchJiraAccount } from "@/server/lib/integrations/jira";
import { ServerError } from "@/server/lib/server-error";

import "server-only";

export type CreateIssueInput = {
    summary: string;
    description: string;
    issueType: string;
    reporterEmail?: string;
    attachment?: File | null;
};

// The attachment is uploaded in a second request because the issue API has no multipart form.
export async function createJiraIssue(input: CreateIssueInput): Promise<string> {
    const { deployment: saved, baseUrl: base, email, token, project, assignee: assigneeEmail } = await getJiraConfig();

    if (!base || !token || !project) {
        throw new ServerError("jira configuration is missing", 500);
    }

    const deployment = jiraDeployment(saved);
    const authorization = jiraAuthorization(deployment, email, token);
    const assignee = assigneeEmail ? await userRef(base, authorization, deployment, assigneeEmail) : undefined;
    const reporter = input.reporterEmail ? await userRef(base, authorization, deployment, input.reporterEmail) : undefined;

    const res = await fetch(`${base}/rest/api/2/issue`, {
        method: "POST",
        headers: {
            "Authorization": authorization,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            fields: {
                project: { key: project },
                summary: input.summary,
                description: input.description,
                issuetype: { name: input.issueType },
                ...(assignee && { assignee }),
                ...(reporter && { reporter }),
            },
        }),
    });

    if (!res.ok) {
        throw new ServerError("failed to create jira issue", 500);
    }

    const issueKey: string = (await res.json()).key;

    if (input.attachment) {
        const form = new FormData();
        form.append("file", input.attachment, input.attachment.name);

        const uploadRes = await fetch(`${base}/rest/api/2/issue/${issueKey}/attachments`, {
            method: "POST",
            headers: {
                "Authorization": authorization,
                "X-Atlassian-Token": "no-check",
            },
            body: form,
        });

        if (!uploadRes.ok) {
            throw new ServerError("failed to attach file to jira issue", 500);
        }
    }

    return issueKey;
}

// Data Center names a person by username; Cloud only takes an accountId, found by searching the email.
async function userRef(base: string, authorization: string, deployment: JiraDeployment, email: string): Promise<object | undefined> {
    if (deployment === "data-center") {
        return { name: email };
    }

    const account = await searchJiraAccount(deployment, base, authorization, email).catch(() => undefined);
    return account?.accountId ? { accountId: account.accountId } : undefined;
}
