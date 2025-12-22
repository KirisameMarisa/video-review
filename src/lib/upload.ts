import { useAuthStore } from "@/stores/auth-store";
import { UploadSession, UploadStorageType, VideoRevision } from "@prisma/client";

export async function uploadVideoInit(data: {
    title: string;
    folderKey: string;
}): Promise<{ url: string; session: UploadSession }> {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("folderKey", data.folderKey);

    const res = await fetch("/api/videos/upload/init", {
        method: "POST",
        body: formData,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.json();
}

export async function uploadVideoFinish(data: {
    session_id: string,
}): Promise<VideoRevision> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/videos/upload/finish?session_id=${data.session_id}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.json();
}

export async function checkUploadVideoStatus(data: {
    session_id: string,
}): Promise<{ status: string }> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/videos/upload/status?session_id=${data.session_id}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.json();
}


export async function uploadVideo(data: {
    url: string,
    session: UploadSession,
    file: File;
}): Promise<void> {
    const token = useAuthStore.getState().token;

    const formData = new FormData();
    formData.append("file", data.file);

    let res: Response | undefined;
    if (data.session.storage === UploadStorageType.local) {
        res = await fetch(data.url, {
            method: "PUT",
            body: formData,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

    } else if (data.session.storage === UploadStorageType.s3) {
        res = await fetch(data.url, {
            method: "PUT",
            body: data.file,
            headers: {
                "Content-Type": data.file.type,
            },
        });
    }
    return;
}

export async function uploadDrawingInit(data: {
    drawingPath: string | null,
}): Promise<{ url: string; session: UploadSession }> {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("path", data.drawingPath ?? "");
    const res = await fetch("/api/drawing/upload/init", {
        method: "POST",
        body: formData,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.json();
}

export async function uploadDrawingFinish(data: {
    session_id: string,
}): Promise<string> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/drawing/upload/finish?session_id=${data.session_id}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const { filePath } = await res.json();
    return filePath;
}

export async function uploadDrawing(data : {
    url: string,
    session: UploadSession,
    file: Blob;
}): Promise<void> {
    const token = useAuthStore.getState().token;

    let res: Response | undefined;
    if (data.session.storage === UploadStorageType.local) {
        const formData = new FormData();
        formData.append("file", data.file);
        res = await fetch(data.url, {
            method: "PUT",
            body: formData,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

    } else if (data.session.storage === UploadStorageType.s3) {
        res = await fetch(data.url, {
            method: "PUT",
            body: data.file,
            headers: {
                "Content-Type": data.file.type,
            },
        });
    }
    return;
}