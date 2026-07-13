export const OPERATIONAL_ROLLOVER_JITTER_MAX_MS = 2000;

export type OperationalRolloverSchedule = {
  delayMs: number;
  fireAtMs: number;
};

/**
 * Delay until operational rollover refresh (endsAt + jitter).
 * Returns null when endsAt is not a valid ISO timestamp.
 */
export function scheduleNextRolloverAt(
  endsAt: string,
  now: Date,
  jitterMs: number
): OperationalRolloverSchedule | null {
  const endsAtMs = Date.parse(endsAt);
  if (!Number.isFinite(endsAtMs)) {
    return null;
  }

  const safeJitter = Number.isFinite(jitterMs) ? Math.max(0, jitterMs) : 0;
  const fireAtMs = endsAtMs + safeJitter;
  const delayMs = Math.max(0, fireAtMs - now.getTime());

  return { delayMs, fireAtMs };
}

export function randomOperationalRolloverJitterMs(random: () => number = Math.random): number {
  const value = random();
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.floor(value * (OPERATIONAL_ROLLOVER_JITTER_MAX_MS + 1));
}
