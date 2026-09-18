const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_KEYS = 10_000;

type RateLimitEntry = {
    attempts: number[];
    lastSeenAt: number;
};

const attemptsByKey = new Map<string, RateLimitEntry>();

function removeExpiredEntries(now: number): void {
    for (const [key, entry] of attemptsByKey) {
        if (now - entry.lastSeenAt >= WINDOW_MS) {
            attemptsByKey.delete(key);
        }
    }
}

function trimTrackedKeys(): void {
    if (attemptsByKey.size < MAX_TRACKED_KEYS) return;

    let oldestKey: string | undefined;
    let oldestLastSeenAt = Number.POSITIVE_INFINITY;

    for (const [key, entry] of attemptsByKey) {
        if (entry.lastSeenAt < oldestLastSeenAt) {
            oldestKey = key;
            oldestLastSeenAt = entry.lastSeenAt;
        }
    }

    if (oldestKey) attemptsByKey.delete(oldestKey);
}

export function consumeSubmitAttempt(key: string, now = Date.now()): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
    removeExpiredEntries(now);

    const entry = attemptsByKey.get(key);
    const attempts = entry?.attempts.filter((attemptAt) => now - attemptAt < WINDOW_MS) ?? [];

    if (attempts.length >= MAX_ATTEMPTS) {
        const oldestAttempt = attempts[0];
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldestAttempt)) / 1_000))
        };
    }

    if (!entry) trimTrackedKeys();
    attempts.push(now);
    attemptsByKey.set(key, { attempts, lastSeenAt: now });

    return { allowed: true };
}
