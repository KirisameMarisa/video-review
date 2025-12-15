import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@xyflow/react/dist/style.css";
import { LocaleProvider } from "./locale-provider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE,
    description: process.env.NEXT_PUBLIC_VIDEO_REVIEW_DESC,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <LocaleProvider>{children}</LocaleProvider>
            </body>
        </html>
    );
}
