"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/ui/checkbox";

export default function Login() {
    const t = useTranslations("login");
    const router = useRouter();

    const cacheNoJIRAAccount = useAuthStore((e) => !e.canUseIssueTracker);
    const cacheDisplayName = useAuthStore((e) => e.displayName);
    const cacheEmail = useAuthStore((e) => e.email);
    const { setAuth } = useAuthStore();
    
    const [noJIRAAccount, setNoJIRAAccount] = useState(false);
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        setNoJIRAAccount(cacheNoJIRAAccount);
        setEmail(cacheEmail ?? "");
        setDisplayName(cacheDisplayName ?? "");
    }, []);

    const handleLogin = async () => {
        const data = await api.login(email, displayName, noJIRAAccount);
        if (data.token) {
            setAuth(data.id, email, data.token, data.displayName, noJIRAAccount);
            router.push("/video-review/review");
        } else {
            alert(t("loginFailedMsg"));
        }
    };

    const bg = process.env.NEXT_PUBLIC_LOGIN_BG
        ? `url('${process.env.NEXT_PUBLIC_LOGIN_BG}')`
        : "none";

    return (
        <div
            className="flex items-center justify-center w-screen h-screen bg-[#181818]"
            style={{
                backgroundImage: bg,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* 中央のパネル */}
            <div className="w-100 p-8 rounded-xl bg-[#202020]/80 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm border border-[#333]">
                <h1 className="text-lg mb-6 font-semibold text-center text-[#ff8800]">
                    {process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE}
                </h1>

                {!noJIRAAccount ? (
                    <input
                        type="email"
                        placeholder={t("loginEmail")}
                        onKeyDown={(x) => x.key === "Enter" && handleLogin()}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition"
                    />
                ) : (
                    <>
                        <input
                            type="username"
                            placeholder={t("loginDisplayName")}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition"
                        />
                        <input
                            type="email"
                            placeholder={t("loginEmail")}
                            onKeyDown={(x) =>
                                x.key === "Enter" && handleLogin()
                            }
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition"
                        />
                    </>
                )}

                <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                        id="no-jira"
                        checked={noJIRAAccount}
                        onCheckedChange={(v) => setNoJIRAAccount(!!v)}
                    />
                    <label
                        htmlFor="no-jira"
                        className="text-white text-sm cursor-pointer"
                    >
                        {t("noJIRAAccount")}
                    </label>
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full py-2 rounded font-medium bg-[#ff8800] text-white hover:bg-[#ffaa33] transition"
                >
                    {t("ok")}
                </button>
            </div>
        </div>
    );
}
