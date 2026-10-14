import { ReviewFrame } from "@/app/video-review/review/review-frame";

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <ReviewFrame>{children}</ReviewFrame>;
}
