import {
  addStayCalendarDays,
  stayRecordCheckInDate,
  stayRecordCheckOutDate,
} from '@/entities/guest-stay';

export const PLAN_STAY_LIFECYCLE_STATUSES = [
  'arrival',
  'checked_in',
  'leaving',
  'late',
] as const;

export type PlanStayLifecycleStatus = (typeof PLAN_STAY_LIFECYCLE_STATUSES)[number];

export type PlanStayLifecycleStay = {
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
  check_in_at: string;
  check_out_at: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
  revoked_at?: string | null;
};

/**
 * Plan occupancy lifecycle for a single night cell.
 * Badges are today-only: returns null unless `nightDate === today`.
 *
 * Late uses today > check-in day (not ≥) so check-in day without admit stays `arrival`
 * (matches acceptance “Late after check-in day”; table ≥ would erase arrival via priority).
 */
export function resolvePlanStayLifecycleStatus(input: {
  stay: PlanStayLifecycleStay;
  today: string;
  nightDate: string;
}): PlanStayLifecycleStatus | null {
  const { stay, today, nightDate } = input;
  if (nightDate !== today) return null;
  if (stay.revoked_at) return null;

  const checkInDay = stayRecordCheckInDate(stay);
  const checkOutDay = stayRecordCheckOutDate(stay);
  if (!(checkInDay <= today && today < checkOutDay)) return null;

  const admitted = Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
  const lastNight = addStayCalendarDays(checkOutDay, -1);
  const isCheckInDay = today === checkInDay;
  const isLastNight = today === lastNight;

  // Priority: late > arrival > leaving > checked_in
  if (!admitted && today > checkInDay) return 'late';
  if (!admitted && isCheckInDay) return 'arrival';
  if (admitted && isLastNight) return 'leaving';
  if (admitted) return 'checked_in';
  return null;
}

export function planStayLifecycleStatusLabel(status: PlanStayLifecycleStatus): string {
  switch (status) {
    case 'arrival':
      return 'Arriving';
    case 'checked_in':
      return 'In';
    case 'leaving':
      return 'Leaving';
    case 'late':
      return 'Late';
  }
}
