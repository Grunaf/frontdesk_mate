import { isStayCheckInStarted } from './stayCheckInMoment';

export type StayAdmitFields = {
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
};

export type StayBedUnlockFields = StayAdmitFields & {
  bed_unlocked_at?: string | null;
  check_in_at?: string | null;
  check_in_date?: string | null;
};

/** Occupancy admit: desk check-in only (passport is an independent checklist). */
export function resolveIsStayAdmitted(stay: StayAdmitFields): boolean {
  return Boolean(stay.desk_checked_in_at);
}

export function resolveIsPassportChecked(stay: Pick<StayAdmitFields, 'passport_checked_at'>): boolean {
  return Boolean(stay.passport_checked_at);
}

/**
 * Guest may see bed assignment only when housekeeping marked the bed ready.
 * Unset / needs_strip / stripped → not ready (no silent reveal).
 */
export function isBedReadyForGuestVisibility(status: string | undefined): boolean {
  return status === 'ready';
}

export type ResolveIsBedVisibleInput = StayBedUnlockFields & {
  /** Housekeeping bed status (`ready` | `stripped` | …); unset = not ready. */
  bedStatus: string | undefined;
  propertyTimeZone?: string | null;
  checkInTimeFallback?: string | null;
  now?: Date;
};

/**
 * Bed visible when ready AND (check-in time reached OR manual unlock OR admitted).
 * Prefer stamping `bed_unlocked_at` on check-in for audit; admit alone still counts.
 */
export function resolveIsBedVisible(input: ResolveIsBedVisibleInput): boolean {
  if (!isBedReadyForGuestVisibility(input.bedStatus)) {
    return false;
  }

  if (input.bed_unlocked_at) {
    return true;
  }

  if (resolveIsStayAdmitted(input)) {
    return true;
  }

  return isStayCheckInStarted({
    checkInAt: input.check_in_at,
    checkInDate: input.check_in_date,
    checkInTimeFallback: input.checkInTimeFallback,
    propertyTimeZone: input.propertyTimeZone,
    now: input.now,
  });
}

/** Early unlock still useful: before check-in time, not yet unlocked, not admitted. */
export function resolveShowUnlockBedAction(input: {
  stay: StayBedUnlockFields;
  stayEnded: boolean;
  propertyTimeZone?: string | null;
  checkInTimeFallback?: string | null;
  now?: Date;
}): boolean {
  if (input.stayEnded) return false;
  if (input.stay.bed_unlocked_at) return false;
  if (resolveIsStayAdmitted(input.stay)) return false;

  const checkInStarted = isStayCheckInStarted({
    checkInAt: input.stay.check_in_at,
    checkInDate: input.stay.check_in_date,
    checkInTimeFallback: input.checkInTimeFallback,
    propertyTimeZone: input.propertyTimeZone,
    now: input.now,
  });
  return !checkInStarted;
}
