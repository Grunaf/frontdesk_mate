import { isValidTimeValue } from '@/shared/lib/time';

export type DepartureSectionPhase = 'ahead' | 'due_soon' | 'overdue';

export const DEPARTURE_DUE_SOON_MINUTES = 120;

const PHASE_RANK: Record<DepartureSectionPhase, number> = {
  ahead: 0,
  due_soon: 1,
  overdue: 2,
};

/** UTC wall-clock on `dateStr` (YYYY-MM-DD) + HH:mm — same v1 model as operational day. */
function parseUtcWallDateTime(dateStr: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

/**
 * Phase for one departure relative to tenant check-out time on that stay's check-out date.
 * No checkOutTime / invalid → always `ahead` (no escalation fallback).
 */
export function resolveDepartureSectionPhase(input: {
  now: Date;
  checkOutTime?: string | null;
  /** Exclusive stay end date (calendar morning of departure). */
  checkOutDate: string;
  dueSoonMinutes?: number;
}): DepartureSectionPhase {
  const time = input.checkOutTime?.trim();
  if (!time || !isValidTimeValue(time)) {
    return 'ahead';
  }

  const checkOutAt = parseUtcWallDateTime(input.checkOutDate, time);
  const dueSoonMs = (input.dueSoonMinutes ?? DEPARTURE_DUE_SOON_MINUTES) * 60 * 1000;
  const nowMs = input.now.getTime();

  if (nowMs >= checkOutAt.getTime()) return 'overdue';
  if (nowMs >= checkOutAt.getTime() - dueSoonMs) return 'due_soon';
  return 'ahead';
}

/** Most urgent phase among stays (overdue > due_soon > ahead). */
export function resolveDeparturesSectionPhase(
  phases: DepartureSectionPhase[]
): DepartureSectionPhase {
  let best: DepartureSectionPhase = 'ahead';
  for (const phase of phases) {
    if (PHASE_RANK[phase] > PHASE_RANK[best]) {
      best = phase;
    }
  }
  return best;
}
