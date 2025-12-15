import VideoCommentPanel from "@/components/video-comment-panel";
import VideoListPanel from "@/components/video-list-panel";
import { SettingPopover } from "@/components/setting";

export default function VideoReviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="grid w-screen h-screen"
      style={{
        gridTemplateColumns: "20% 60% 20%",
        background: "#181818",
        color: "#eee",
        fontFamily: "sans-serif",
      }}
    >
      {/* 左 */}
      <div className="flex flex-col h-full border-r border-[#333]">
        <VideoListPanel />
        <SettingPopover />
      </div>

      {/* 中央 → ここに page.tsx が差し替わる */}
      <div className="flex flex-col h-full border-r border-[#333]">
        {children}
      </div>

      {/* 右 */}
      <div className="flex flex-col h-full border-l border-[#333]">
        <VideoCommentPanel />
      </div>
    </div>
  );
}