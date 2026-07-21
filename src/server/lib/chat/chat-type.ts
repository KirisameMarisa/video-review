export interface ChatType {
    commentId: string | undefined,
    commentText: string | undefined,
    videoId: string | undefined,
    videoTitle: string | undefined,
    folderKey: string | undefined,
    scenePath: string | undefined,
    email: string | undefined,
    userName: string | undefined,
    videoLink: string | undefined,
    sceneLink: string | undefined,
    screenshot: any,
};

export type ChatProviders = "slack" | "teams" | "chatwork" | "webhook" | "email"