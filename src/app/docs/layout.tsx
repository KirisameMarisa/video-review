
export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body>
                {children}
            </body>
        </html>
    );
}
