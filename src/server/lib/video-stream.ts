import "server-only";

type Send = (event: string, data: unknown) => void;

interface Subscriber {
    syncing: boolean;
    send: Send;
}

// Kept on globalThis so a dev hot reload of this module still sees the open connections.
const globalForStream = globalThis as unknown as {
    videoStreamChannels?: Map<string, Set<Subscriber>>;
};

const channels = globalForStream.videoStreamChannels ?? new Map<string, Set<Subscriber>>();
globalForStream.videoStreamChannels = channels;

function broadcastParticipants(subscribers: Set<Subscriber>) {
    const participants = [...subscribers].filter((s) => s.syncing).length;

    for (const s of subscribers) {
        s.send("sync", { participants });
    }
}

// Returns the unsubscribe; safe to call twice, as both the stream's abort and its finally run it.
export function subscribeVideoStream(videoId: string, syncing: boolean, send: Send): () => void {
    let subscribers = channels.get(videoId);
    if (!subscribers) {
        subscribers = new Set();
        channels.set(videoId, subscribers);
    }

    const self: Subscriber = { syncing, send };
    subscribers.add(self);
    broadcastParticipants(subscribers);

    let unsubscribed = false;
    return () => {
        if (unsubscribed) {
            return;
        }
        unsubscribed = true;

        subscribers.delete(self);
        if (subscribers.size === 0) {
            channels.delete(videoId);
            return;
        }
        broadcastParticipants(subscribers);
    };
}
