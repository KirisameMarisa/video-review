import { ReviewFrame } from "@/app/video-review/review/review-frame";

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="w-screen h-screen">
            <div>
                <ReviewFrame>{children}</ReviewFrame>
            </div>
        </div>
    );
}
