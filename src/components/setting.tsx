"use client";

import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { useLocale } from "@/app/locale-provider";
import { Switch } from "@/ui/switch";
import { useTranslations } from "next-intl";

export function SettingPopover() {
    const t = useTranslations("setting");

    const { locale, setLocale } = useLocale();

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
                <div className="space-y-4 min-w-[360px]">
                    {/* 設定タイトル */}
                    <div className="text-sm font-medium text-gray-200">
                        {t("title")}
                    </div>

                    {/* 言語設定 */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm text-gray-100">
                                {t("language")}
                            </span>
                            <span className="text-xs text-gray-400">
                                {locale === "ja"
                                    ? t("languageOptionJa")
                                    : t("languageOptionEn")}
                            </span>
                        </div>

                        <div className="flex-shrink-0 w-12 flex justify-end">
                            <Switch
                                className="border-white"
                                checked={locale === "ja"}
                                onCheckedChange={(x) =>
                                    setLocale(x ? "ja" : "en")
                                }
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
