"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import * as auth from "@/lib/auth";
import { useTranslations } from "next-intl";
import { Tabs } from "@/ui/tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

export default function Login() {
    const t = useTranslations("login");
    const router = useRouter();

    const cacheDisplayName = useAuthStore((e) => e.displayName);
    const cacheEmail = useAuthStore((e) => e.email);
    const { setAuth } = useAuthStore();

    const [type, setType] = useState<auth.LoginType>(process.env.NEXT_PUBLIC_LOGIN_DEFAULT_TYPE as auth.LoginType ?? "guest");
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        setEmail(cacheEmail ?? "");
        setDisplayName(cacheDisplayName ?? "");
    }, []);

    const handleLogin = async () => {
        try {
            const data = await auth.login(type, { email, displayName, password });
            setAuth(data.id, data.email, data.role, data.token, data.displayName);
            router.push("/video-review/review");
        } catch (e) {
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
            {/* Login Panel */}
            <div style={{minHeight:"400px"}} className="w-100 p-8 rounded-xl bg-[#202020]/80 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm border border-[#333]">
                <h1 className="text-lg mb-6 font-semibold text-center text-[#ff8800]">
                    {process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE}
                </h1>
                <Tabs defaultValue={type} onValueChange={(val) => setType(val as auth.LoginType)}
                    className={[
                        "px-4 py-1.5 text-sm rounded-full",
                        "data-[state=active]:bg-[#ff8800]",
                        "data-[state=active]:text-black",
                        "data-[state=inactive]:text-gray-300",
                        "transition"
                    ].join(" ")}>
                    <TabsList>
                        <TabsTrigger value="guest">Guest</TabsTrigger>
                        <TabsTrigger value="jira">JIRA</TabsTrigger>
                        <TabsTrigger value="admin">Admin</TabsTrigger>
                    </TabsList>
                    <TabsContent value="guest">
                        <div className="login-card rounded-2xl bg-[#1f1f1f] p-3 shadow-xl">
                            <div className="h-[30px]"></div>
                            <div className="grid gap-3">
                                <Label htmlFor="displayName">{t("displayName")}</Label>
                                <Input id="displayName"
                                    type="text"
                                    value={displayName ?? ""}
                                    onChange={(x) => setDisplayName(x.target.value)}
                                    className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                            </div>
                            <ButtonLogin exec={handleLogin} title={t("ok")} />
                        </div>
                    </TabsContent>
                    <TabsContent value="jira">
                        <div className="login-card rounded-2xl bg-[#1f1f1f] p-3 shadow-xl">
                            <div className="h-[30px]"></div>
                            <div className="grid gap-3">
                                <Label htmlFor="email">{t("email")}</Label>
                                <Input id="email"
                                    type="email"
                                    value={email ?? ""}
                                    onChange={(x) => setEmail(x.target.value)}
                                    className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                            </div>
                            <ButtonLogin exec={handleLogin} title={t("ok")} />
                        </div>
                    </TabsContent>
                    <TabsContent value="admin">
                        <div className="login-card rounded-2xl bg-[#1f1f1f] p-3 shadow-xl">
                            <div className="grid gap-3">
                                <Label htmlFor="email">{t("email")}</Label>
                                <Input type="email"
                                    value={email ?? ""}
                                    onChange={(x) => setEmail(x.target.value)}
                                    className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="password">{t("password")}</Label>
                                <Input type="password"
                                    onKeyDown={(x) => x.key === "Enter" && handleLogin()}
                                    value={password ?? ""}
                                    onChange={(x) => setPassword(x.target.value)}
                                    className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                            </div>
                            <ButtonLogin exec={handleLogin} title={t("ok")} />
                        </div>

                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}

function ButtonLogin({ exec, title }: { exec: () => void; title: string }) {
    return (
        <>
            <Button
                onClick={exec}
                className="w-full py-2 rounded font-medium bg-[#ff8800] text-white hover:bg-[#ffaa33] transition"
            >
                {title}
            </Button>
        </>
    );
}