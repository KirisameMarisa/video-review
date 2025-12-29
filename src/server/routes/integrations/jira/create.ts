import { authorize, JwtError } from "@/server/lib/auth/token";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const createRouter = new Hono();

createRouter.post('/', async (c) => {
try {
        authorize(c.req.raw, ["viewer", "admin"]);
    } catch (e) {
        if (e instanceof JwtError) {
            return c.json({ error: e.message }, e.status as ContentfulStatusCode);
        }
        return c.json({ error: "unauthorized" }, 401);
    }

    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL;
    const token = process.env.JIRA_API_TOKEN;
    const project = process.env.JIRA_PROJECT;
    const assigneeEmail = process.env.JIRA_ASSIGNEE_USER;

    // 500: サーバー設定不備
    if (!base || !token || !project) {
        return c.json({ error: "jira configuration is missing" }, 500);
    }

    try {
        const formData = await c.req.formData();
        const summary = formData.get("summary") as string;
        const description = formData.get("description") as string;
        const issueType = formData.get("issueType") as string;
        const reporterEmail = formData.get("reporterEmail") as string;
        const file = formData.get("file") as File | null;

        // 400: 必須項目不足
        if (!summary || !description || !issueType) {
            return c.json({ error: "invalid request body" }, 400);
        }

        const res = await fetch(`${base}/rest/api/2/issue`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                fields: {
                    project: { key: project },
                    summary,
                    description,
                    issuetype: { name: issueType },
                    ...(assigneeEmail && { assignee: { name: assigneeEmail } }),
                    ...(reporterEmail && { reporter: { name: reporterEmail } }),
                },
            }),
        });

        if (!res.ok) {
            return c.json({ error: "failed to create jira issue" }, 500);
        }

        const data = await res.json();
        const issueKey = data.key;

        if (file) {
            const attachForm = new FormData();
            attachForm.append("file", file, file.name);

            const uploadRes = await fetch(
                `${base}/rest/api/2/issue/${issueKey}/attachments`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-Atlassian-Token": "no-check",
                    },
                    body: attachForm,
                }
            );

            if (!uploadRes.ok) {
                return c.json({ error: "failed to attach file to jira issue" }, 500);
            }
        }
        return c.json({ issueKey }, { status: 200 });
    } catch {
        return c.json({ error: "internal error" }, 500);
    }
});