"use client"
import Login from "@/components/login";
import { LanguageMenu } from "@/components/setting";

export default function LoginPage() {
    return (
        <div className="flex h-full">
            <Login />
            <LanguageMenu />
        </div>
    );
}
