import { isAdmin } from "@/lib/role";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoListStore } from "@/stores/video-list-store";

// The mode is admin-only, and the flag outlives a sign-out in the same tab, so the role is read
// alongside it.
export function useOrganizing(): boolean {
    const organizing = useVideoListStore((s) => s.organizing);
    const role = useAuthStore((s) => s.role);

    return organizing && isAdmin(role);
}
