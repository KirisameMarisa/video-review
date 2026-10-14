import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import "@/styles/globals.css";
import "@xyflow/react/dist/style.css";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});


export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased w-screen h-dvh`}>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
