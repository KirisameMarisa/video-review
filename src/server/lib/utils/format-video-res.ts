// A function that converts a video path into a file path of the video's resolution.
export function formatVideoRes(videoPath: string, targetRes: number): string {
    const extIndex = videoPath.lastIndexOf(".");
    if (extIndex === -1) {
        return videoPath;
    }
    const namePart = videoPath.substring(0, extIndex);
    const extPart = videoPath.substring(extIndex);
    return `${namePart}_${targetRes}p${extPart}`;
}