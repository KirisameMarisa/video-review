import VideoCommentPanel from "@/components/video-comment-panel";
import VideoListPanel from "@/components/video-list-panel";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div
            className="w-screen h-screen"
            style={{ background: "#181818", color: "#eee", fontFamily: "sans-serif" }}
        >
            <div>
                <SidebarProvider>
                    <VideoListPanel />
                    <div className="w-screen h-screen grid" style={{gridTemplateColumns: "80% 20%"}}>
                        <div className="flex flex-col  min-h-0 w-full h-full border-r border-[#333]">
                            {children}
                        </div>
                        <div className="flex flex-col min-h-0 w-full h-full border-l border-[#333]">
                            <VideoCommentPanel />
                        </div>
                    </div>
                </SidebarProvider>
            </div>
        </div>
    );
}
