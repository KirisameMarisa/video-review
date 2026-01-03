import { Video } from "@/lib/db-types";

export interface VideoNode {
    id: string;
    name: string;
    type: "folder" | "video";
    children?: VideoNode[];
    video?: Video;
    unread: boolean;
}