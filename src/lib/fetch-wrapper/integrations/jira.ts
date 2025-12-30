import { useAuthStore } from "@/stores/auth-store";

export async function createJiraIssue(
    reporterEmail: string,
    issueType: string,
    summary: string,
    description: string,
    screenshot: Blob | null,
) {
    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("summary", summary);
    form.append("description", description);
    form.append("issueType", issueType);
    form.append("reporterEmail", reporterEmail);
    if (screenshot) {
        form.append("file", new File([screenshot], "screenshot.png"));
    }

    const res = await fetch("/api/v1/integrations/jira/create", {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if(res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("unauthorized");
    }

    if (!res.ok) throw new Error("Failed to update comment");

    const json = await res.json();
    return json.issueKey;
}
