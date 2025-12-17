import type { Metadata } from "next";
import "@/styles/globals.css";
import "@xyflow/react/dist/style.css";
import { LocaleProvider } from "../locale-provider";

export const metadata: Metadata = {
    title: process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE,
    description: process.env.NEXT_PUBLIC_VIDEO_REVIEW_DESC,
};

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <LocaleProvider>
            {children}
        </LocaleProvider>
    );
}
