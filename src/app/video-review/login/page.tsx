"use client"
import Login from "@/components/login";
import { SettingPopover } from "@/components/setting";

export default function LoginPage() {
    return (
        <div className="flex h-screen">
            <Login />
            <SettingPopover />
        </div>
    );
}
