const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;

const buckets = new Map<string, number[]>();

export function checkGuidedFillRateLimit(sessionKey: string): boolean {
  const now = Date.now();
  const timestamps = buckets.get(sessionKey) ?? [];
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    buckets.set(sessionKey, recent);
    return false;
  }

  recent.push(now);
  buckets.set(sessionKey, recent);
  return true;
}

/** Test helper */
export function resetGuidedFillRateLimitForTests(): void {
  buckets.clear();
}
