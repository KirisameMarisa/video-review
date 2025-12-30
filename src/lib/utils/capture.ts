export function captureFrame(video: HTMLVideoElement | null): Promise<Blob | null> {
    return new Promise((resolve) => {
        if (video === null) return resolve(null);

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/png");
    });
}
