import { apiError } from "@/lib/api-response";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/jira/create:
 *   post:
 *     summary: Create JIRA issue
 *     description: >
 *       Creates a JIRA issue with optional file attachment.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - summary
 *               - description
 *               - issueType
 *             properties:
 *               summary:
 *                 type: string
 *               description:
 *                 type: string
 *               issueType:
 *                 type: string
 *               reporterEmail:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Issue created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 issueKey:
 *                   type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to create JIRA issue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL;
    const token = process.env.JIRA_API_TOKEN;
    const project = process.env.JIRA_PROJECT;
    const assigneeEmail = process.env.JIRA_ASSIGNEE_USER;

    // 500: サーバー設定不備
    if (!base || !token || !project) {
        return apiError("jira configuration is missing", 500);
    }

    try {
        const formData = await req.formData();
        const summary = formData.get("summary") as string;
        const description = formData.get("description") as string;
        const issueType = formData.get("issueType") as string;
        const reporterEmail = formData.get("reporterEmail") as string;
        const file = formData.get("file") as File | null;

        // 400: 必須項目不足
        if (!summary || !description || !issueType) {
            return apiError("invalid request body", 400);
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
            return apiError("failed to create jira issue", 500);
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
                return apiError("failed to attach file to jira issue", 500);
            }
        }

        return NextResponse.json({ issueKey }, { status: 200 });

    } catch {
        return apiError("internal error", 500);
    }
}
