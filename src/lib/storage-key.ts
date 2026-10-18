import { v4 as uuidv4 } from "uuid";

// Every storage key is composed here.
// A new* function allocates a fresh key on each call; the others rebuild the same key from the same input.

// A comment owns one drawing, so its place is fixed by the comment id.
export const drawingKey = (commentId: string) => `drawing/${commentId}.png`;

export const newAvatarKey = () => `avatars/${uuidv4()}.png`;

export const videoRevisionKey = (videoId: string, revision: number) =>
    `videos/${videoId}/rev_${String(revision).padStart(3, "0")}.mp4`;

// The downscaled copy sits beside its source, always as .mp4.
export const downscaledVideoKey = (key: string, width: number) => key.replace(/\.[^./]+$/, "") + `_${width}p.mp4`;

export const thumbnailKey = (id: string) => `thumbnails/${id}/thumb.png`;
