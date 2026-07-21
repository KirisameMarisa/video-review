"use client";

import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faRightFromBracket, faUserEdit } from "@fortawesome/free-solid-svg-icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { useLocale } from "@/app/locale-provider";
import { Switch } from "@/ui/switch";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { ControlRow } from "@/ui/control-row";
import { useEffect, useState } from "react";
import EditUserProfileDialog from "@/components/dialog/edit-user-profile";
import { Separator } from "@/ui/separator";
import { env } from "@/lib/env";

export function SettingPopover() {
    const t = useTranslations("setting");

    const [ isLogged, setLogged ] = useState(false);
    const { locale, setLocale } = useLocale();
    const [ editProfileOpen, setEditProfileOpen] = useState(false);

    const { verifyAuth } = useAuthStore();

    useEffect(() => {
        void (async () => {
            try {
                const auth = await verifyAuth();
                setLogged(auth !== null); 
            } catch { }
        })();
    }, [])


    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="absolute bottom-4 left-4 flex gap-2 opacity-40 hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" className="relative">
                        <FontAwesomeIcon
                            icon={faGear}
                            className="text-[#ff8800]"
                        />
                    </Button>
                </div>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-full bg-[#1f1f1f] border border-[#333] text-white"
            >
                <div className="space-y-2 min-w-[360px]">
                    <div className="text-m font-medium text-gray-200">
                        {t("title")}
                    </div>

                    <Separator className="bg-gray-100"/>

                    {/* Edit profile */}
                    {ControlRow(t("editProfile"), () => {
                        return (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditProfileOpen(true); }}
                                className="text-white hover:bg-[#d4d4d4] rounded-full w-8 h-8"
                            >
                                <FontAwesomeIcon icon={faUserEdit} />
                            </Button>
                        );
                    }, !isLogged)}

                    {/* Language setting */}
                    {ControlRow(t("language"), () => {
                        return (
                            <Switch
                                className="border-white"
                                checked={locale === "ja"}
                                onCheckedChange={(x) =>
                                    setLocale(x ? "ja" : "en")
                                }
                            />
                        );
                    })}

                    {/* Logout */}
                    {ControlRow(t("logout"), () => {
                        return (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    useAuthStore.getState().logout();
                                }}
                                className="text-white hover:bg-[#d4d4d4] rounded-full w-8 h-8"
                            >
                                <FontAwesomeIcon icon={faRightFromBracket} />
                            </Button>
                        );
                    }, !isLogged)}

                    <EditUserProfileDialog open={editProfileOpen} onClose={() => { setEditProfileOpen(false) }} />
                </div>
            </PopoverContent>
        </Popover>
    );
}
