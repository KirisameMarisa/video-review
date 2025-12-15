"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";

type LocaleContextType = {
    locale: string;
    setLocale: (locale: string) => void;
};

const LocaleContext = createContext<LocaleContextType>({
    locale: "ja",
    setLocale: () => {},
});

const MessagesMap: Record<string, () => Promise<{ default: any }>> = {
    ja: () => import("../messages/ja.json"),
    en: () => import("../messages/en.json"),
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState("ja");
    const [messages, setMessagess] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("locale") as string ?? "ja";
        setLocaleState(stored);
        MessagesMap[stored]().then((m: any) => setMessagess(m.default));
    }, []);

    const setLocale = (loc: string) => {
        setLocaleState(loc);
        localStorage.setItem("locale", loc);
        MessagesMap[loc]().then((m: any) => setMessagess(m.default));
    };

    if (!messages) return null;

    return (
        <LocaleContext.Provider value={{ locale, setLocale }}>
            <NextIntlClientProvider messages={messages} locale={locale}>
                {children}
            </NextIntlClientProvider>
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}
