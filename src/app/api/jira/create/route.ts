import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL!;
    const token = process.env.JIRA_API_TOKEN!;
    const project = process.env.JIRA_PROJECT!;
    const assigneeEmail = process.env.JIRA_ASSIGNEE_USER!;

    const formData = await req.formData();
    const summary = formData.get("summary") as string;
    const description = formData.get("description") as string;
    const issueType = formData.get("issueType") as string;
    const reporterEmail = formData.get("reporterEmail") as string;
    const file = formData.get("file") as File | null;

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
        return NextResponse.json({ error: `Failed to create JIRA issue: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const issueKey = data.key;

    if (file) {
        const attachForm = new FormData();
        attachForm.append("file", file, file.name);

        const uploadRes = await fetch(`${base}/rest/api/2/issue/${issueKey}/attachments`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "X-Atlassian-Token": "no-check",
            },
            body: attachForm,
        });

        if (!uploadRes.ok) {
            return NextResponse.json({ error: `Failed to attach file: ${uploadRes.status}` }, { status: 500 });
        }
    }

    return NextResponse.json({ issueKey });
}
