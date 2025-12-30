import { useAuthStore } from "@/stores/auth-store";

export async function postToSlack(
    text: string,
    screenshot: Blob | null,
): Promise<boolean> {
    if(screenshot === null) {
        return false;
    }

    const token = useAuthStore.getState().token;
    const form = new FormData();
    form.append("comment", text);
    form.append("file", new File([screenshot], "screenshot.png"));
    if (screenshot) {
        form.append("file", new File([screenshot], "screenshot.png"));
    }

    const res = await fetch("/api/v1/integrations/slack/post", {
        method: "POST",
        body: form,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401 || !res.ok) {
        return false;
    }
    return true;
}
