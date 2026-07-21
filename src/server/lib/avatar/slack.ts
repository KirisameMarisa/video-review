import { SlackClient } from "@/server/lib/integration-clients/slack-client";

export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | undefined> {
    if (!SlackClient){
        return undefined;
    }

    if (!email) {
        return undefined;
    }

    try {
        const res = await SlackClient.users.lookupByEmail({ email });
        if (!res.ok || !res.user) {
            return undefined;
        }

        const avatarUrl =
            res.user.profile?.image_48 ??
            res.user.profile?.image_72;

        if (!avatarUrl) {
            return undefined;
        }

        const imgRes = await fetch(avatarUrl);
        if (!imgRes.ok) {
            return undefined;
        }

        return Buffer.from(await imgRes.arrayBuffer());
    } catch (e){
        return undefined;
    }
}
