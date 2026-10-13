// The storage key of a revision's downscaled variant. The video-processing worker writes
// `<name>_<width>p.mp4` beside the source for each resolution preset, always as .mp4.
export function formatVideoRes(videoPath: string, targetRes: number): string {
    return videoPath.replace(/\.[^./]+$/, "") + `_${targetRes}p.mp4`;
}
