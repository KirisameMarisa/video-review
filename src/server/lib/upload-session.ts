import { UploadSession } from '@/lib/db-types';
import { prisma } from '@/server/lib/db';

type SessionParam = Omit<UploadSession, "id" | "createdAt">;

export async function createSession(session: SessionParam): Promise<UploadSession> {
    const new_session = await prisma.uploadSession.create({
        data: {
            ...session,
        },
    });

    return new_session;
}

export async function deleteSession(id: string): Promise<void> {
    await prisma.uploadSession.delete({
        where: { id },
    });
}

export async function hasSession(id: string): Promise<boolean> {
    const count = await prisma.uploadSession.count({
        where: { id },
    });
    return count > 0;
}

export async function getSession(id: string): Promise<UploadSession | null> {
    const ret = await prisma.uploadSession.findUnique({
        where: { id },
    });
    return ret;
}
