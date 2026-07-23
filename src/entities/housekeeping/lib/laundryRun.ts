import {
  HOUSEKEEPING_LAUNDRY_PROGRAMS,
  HOUSEKEEPING_LAUNDRY_RUN_STATUSES,
  type HousekeepingLaundryProgram,
  type HousekeepingLaundryRunStatus,
} from '../model/types';

export function isHousekeepingLaundryRunStatus(
  value: unknown
): value is HousekeepingLaundryRunStatus {
  return (
    typeof value === 'string' &&
    (HOUSEKEEPING_LAUNDRY_RUN_STATUSES as readonly string[]).includes(value)
  );
}

export function isHousekeepingLaundryProgram(
  value: unknown
): value is HousekeepingLaundryProgram {
  return (
    typeof value === 'string' &&
    (HOUSEKEEPING_LAUNDRY_PROGRAMS as readonly string[]).includes(value)
  );
}

export function normalizeLaundryDurationMinutes(
  value: unknown,
  fallback: number = 45
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded < 1) return fallback;
  return rounded;
}

export function computeLaundryEndsAt(
  startedAt: Date | string,
  durationMinutes: number
): Date {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const minutes = normalizeLaundryDurationMinutes(durationMinutes, durationMinutes);
  return new Date(start.getTime() + Math.max(1, minutes) * 60_000);
}

export function resolveLaundryRemainingMs(
  endsAt: Date | string,
  now: Date | string = new Date()
): number {
  const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt;
  const current = typeof now === 'string' ? new Date(now) : now;
  return Math.max(0, end.getTime() - current.getTime());
}

/** Mm:ss countdown label for Cleaning Wash block. */
export function formatLaundryCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function isLaundryUnloadDue(
  endsAt: Date | string,
  now: Date | string = new Date()
): boolean {
  return resolveLaundryRemainingMs(endsAt, now) <= 0;
}

export type LaundryWashUiPhase = 'idle' | 'running' | 'unload';

export function resolveLaundryWashUiPhase(
  run: { status: HousekeepingLaundryRunStatus; ends_at: string } | null | undefined,
  now: Date | string = new Date()
): LaundryWashUiPhase {
  if (!run || run.status !== 'running') return 'idle';
  return isLaundryUnloadDue(run.ends_at, now) ? 'unload' : 'running';
}

/** Map running runs by machine_id (at most one per machine by DB constraint). */
export function indexActiveLaundryRunsByMachine<
  T extends {
    id: string;
    machine_id: string;
    status: HousekeepingLaundryRunStatus;
    ends_at: string;
    program: HousekeepingLaundryProgram;
  },
>(runs: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const run of runs) {
    if (run.status !== 'running') continue;
    const machineId = run.machine_id.trim();
    if (!machineId || out[machineId]) continue;
    out[machineId] = run;
  }
  return out;
}
