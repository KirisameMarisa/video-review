import "server-only";

// What the last person to act was doing; time is where they were when they sent it.
export interface SyncState {
    revisionId: string;
    playing: boolean;
    time: number;
    rate: number;
    // The sending screen, so it can tell its own echo from someone else's action.
    by: string;
}

// The one open stream behind a subscriber, as the route hands it over.
export interface StreamConnection {
    send: (event: string, data: unknown) => void;
    keepAlive: () => void;
    close: () => void;
}

interface Subscriber {
    connectionId: string;
    syncing: boolean;
    connection: StreamConnection;
    // Server clock of the last ping; a successful write proves nothing behind a proxy that keeps the socket open.
    lastSeen: number;
}

interface Channel {
    subscribers: Set<Subscriber>;
    state: SyncState | null;
    // Server clock when state arrived; receivers get its age, so their clocks never need to agree.
    stateAt: number;
}

// The browser pings every 20s; a hidden tab's timers can be held back to once a minute.
const STALE_AFTER_MS = 90_000;
// Also the keepalive interval, under the common 60s idle timeout of proxies in front of the app.
const PATROL_MS = 25_000;

// Kept on globalThis so a dev hot reload of this module still sees the open connections.
const globalForStream = globalThis as unknown as {
    videoStreamChannels?: Map<string, Channel>;
    videoStreamPatrol?: ReturnType<typeof setInterval>;
};

const channels = globalForStream.videoStreamChannels ?? new Map<string, Channel>();
globalForStream.videoStreamChannels = channels;

function broadcastSync(channel: Channel) {
    const participants = [...channel.subscribers].filter((s) => s.syncing).length;
    const state = channel.state && { ...channel.state, ageMs: Date.now() - channel.stateAt };

    for (const s of channel.subscribers) {
        s.connection.send("sync", { participants, state });
    }
}

// Whether others remain to be told; false when already gone, as the close and the patrol can both get here.
function removeSubscriber(videoId: string, channel: Channel, subscriber: Subscriber): boolean {
    if (!channel.subscribers.delete(subscriber)) {
        return false;
    }

    // The first removal always finds its channel still registered, so this cannot drop a newer one.
    if (channel.subscribers.size === 0) {
        channels.delete(videoId);
        return false;
    }
    return true;
}

// The only place that decides a subscriber is gone, other than the browser closing the stream itself.
function patrol() {
    const now = Date.now();

    for (const [videoId, channel] of [...channels]) {
        // Everyone dropped in one round is announced together.
        let othersRemain = false;
        for (const s of [...channel.subscribers]) {
            if (now - s.lastSeen > STALE_AFTER_MS) {
                othersRemain = removeSubscriber(videoId, channel, s);
                s.connection.close();
            } else {
                s.connection.keepAlive();
            }
        }

        if (othersRemain) {
            broadcastSync(channel);
        }
    }

    if (channels.size === 0) {
        clearInterval(globalForStream.videoStreamPatrol);
        globalForStream.videoStreamPatrol = undefined;
    }
}

function startPatrol() {
    if (globalForStream.videoStreamPatrol === undefined) {
        // Never what keeps a process from exiting.
        globalForStream.videoStreamPatrol = setInterval(patrol, PATROL_MS);
        globalForStream.videoStreamPatrol.unref?.();
    }
}

// A dev hot reload replaces patrol(); the timer must run the new one.
if (globalForStream.videoStreamPatrol !== undefined) {
    clearInterval(globalForStream.videoStreamPatrol);
    globalForStream.videoStreamPatrol = undefined;
    startPatrol();
}

function createChannel(videoId: string): Channel {
    const channel: Channel = { subscribers: new Set(), state: null, stateAt: 0 };
    channels.set(videoId, channel);
    return channel;
}

// Returns the unsubscribe for the browser closing the stream.
export function subscribeVideoStream(videoId: string, connectionId: string, syncing: boolean, connection: StreamConnection): () => void {
    const channel = channels.get(videoId) ?? createChannel(videoId);
    const self: Subscriber = { connectionId, syncing, connection, lastSeen: Date.now() };
    channel.subscribers.add(self);
    broadcastSync(channel);
    startPatrol();

    return () => {
        if (removeSubscriber(videoId, channel, self)) {
            broadcastSync(channel);
        }
    };
}

// Returns false when the server no longer has the connection.
export function touchVideoStream(videoId: string, connectionId: string): boolean {
    const channel = channels.get(videoId);
    const subscriber = channel && [...channel.subscribers].find((s) => s.connectionId === connectionId);
    if (!subscriber) {
        return false;
    }

    subscriber.lastSeen = Date.now();
    return true;
}

// A state for a video nobody has open is dropped; the next session starts from whoever acts first.
export function updateSyncState(videoId: string, state: SyncState) {
    const channel = channels.get(videoId);
    if (!channel) {
        return;
    }

    channel.state = state;
    channel.stateAt = Date.now();
    broadcastSync(channel);
}
