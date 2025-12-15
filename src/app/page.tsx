"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
    const router = useRouter();
    const { verifyAuth } = useAuthStore();

    useEffect(() => {
        (async () => {
            router.replace(await verifyAuth() ? "/video-review/review" : "/video-review/login");
        })();
    }, [router]);

    return null;
}
