import { getJiraConfig, jiraAuthorization, jiraDeployment, searchJiraAccount } from "@/server/lib/integrations/jira";

export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | undefined> {
    const { deployment: saved, baseUrl: base, email: accountEmail, token } = await getJiraConfig();

    if (!base || !token) {
        return undefined;
    }

    const deployment = jiraDeployment(saved);
    const authorization = jiraAuthorization(deployment, accountEmail, token);
    const avatarUrl = deployment === "cloud"
        ? await cloudAvatarUrl(base, authorization, email)
        : await dataCenterAvatarUrl(base, authorization, email);
    if (!avatarUrl) {
        return undefined;
    }

    // The avatar may live off the Jira host; the token goes only to Jira itself.
    const headers = avatarUrl.startsWith(base) ? { Authorization: authorization } : undefined;
    const imgRes = await fetch(avatarUrl, { headers });

    if (!imgRes.ok) {
        return undefined;
    }
    return Buffer.from(await imgRes.arrayBuffer());
}

async function dataCenterAvatarUrl(base: string, authorization: string, email: string): Promise<string | undefined> {
    const infoRes = await fetch(
        `${base}/rest/api/2/user/avatars?username=${email}`,
        {
            headers: {
                Authorization: authorization,
                Accept: "application/json",
            },
        }
    );

    if (!infoRes.ok) {
        return undefined;
    }

    const info = await infoRes.json();
    const latest =
        info.custom?.find((a: any) => a.isSelected) ??
        info.system?.find((a: any) => a.isSelected);

    if (!latest || !latest.owner) {
        return undefined;
    }

    return `${base}/secure/useravatar?ownerId=${latest.owner}&avatarId=${latest.id}`;
}

// Cloud has no avatars endpoint; the search result carries the image URLs.
async function cloudAvatarUrl(base: string, authorization: string, email: string): Promise<string | undefined> {
    const account = await searchJiraAccount("cloud", base, authorization, email).catch(() => undefined);
    return account?.avatarUrls?.["48x48"];
}
