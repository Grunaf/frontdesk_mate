import type { GuestStayRecord } from '../model/types';
import { resolveStayCheckInInstantMs } from './stayCheckInMoment';
import { stayRecordCheckInDate, stayRecordCheckOutDate } from './resolveReservationStayPeriod';

/** Optional hostel policy for deriving check-in instant from stay calendar day. */
export type GuestAccessCheckInPolicy = {
  propertyTimeZone?: string | null;
  checkInTime?: string | null;
};

function resolveStayCheckInMs(
  stay: Pick<GuestStayRecord, 'check_in_at'> & { check_in_date?: string | null },
  policy?: GuestAccessCheckInPolicy | null
): number {
  const fromPolicy = resolveStayCheckInInstantMs({
    checkInAt: stay.check_in_at,
    checkInDate: stayRecordCheckInDate(stay),
    propertyTimeZone: policy?.propertyTimeZone,
    checkInTimeFallback: policy?.checkInTime,
  });
  if (fromPolicy != null) {
    return fromPolicy;
  }

  const parsed = Date.parse(stay.check_in_at);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function resolveStayCheckOutMs(checkOutAt: string): number {
  const parsed = Date.parse(checkOutAt);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** Calendar-night overlap: checkout day is exclusive (turnover same day allowed). */
export function guestAccessBedNightsOverlap(
  aCheckInAt: string,
  aCheckOutAt: string,
  bCheckInAt: string,
  bCheckOutAt: string
): boolean {
  const aStart = aCheckInAt.slice(0, 10);
  const aEnd = aCheckOutAt.slice(0, 10);
  const bStart = bCheckInAt.slice(0, 10);
  const bEnd = bCheckOutAt.slice(0, 10);
  return aStart < bEnd && bStart < aEnd;
}

export function isGuestAccessInWindow(
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'revoked_at'> & {
    check_in_date?: string | null;
  },
  now: Date = new Date(),
  policy?: GuestAccessCheckInPolicy | null
): boolean {
  if (stay.revoked_at) return false;
  const nowMs = now.getTime();
  const inMs = resolveStayCheckInMs(stay, policy);
  const outMs = resolveStayCheckOutMs(stay.check_out_at);
  if (!Number.isFinite(inMs) || !Number.isFinite(outMs)) return false;
  return nowMs >= inMs && nowMs <= outMs;
}

export type GuestAccessStatus = 'scheduled' | 'valid_unused' | 'in_app' | 'ended' | 'revoked';

export function resolveGuestAccessStatus(
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'activated_at' | 'revoked_at'> & {
    check_in_date?: string | null;
  },
  now: Date = new Date(),
  policy?: GuestAccessCheckInPolicy | null
): GuestAccessStatus {
  if (stay.revoked_at) return 'revoked';
  const nowMs = now.getTime();
  const outMs = resolveStayCheckOutMs(stay.check_out_at);
  const inMs = resolveStayCheckInMs(stay, policy);
  if (!Number.isFinite(outMs) || !Number.isFinite(inMs)) return 'ended';
  if (nowMs > outMs) return 'ended';
  if (nowMs < inMs) return 'scheduled';
  if (stay.activated_at) return 'in_app';
  return 'valid_unused';
}

export function guestAccessStatusLabel(status: GuestAccessStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'valid_unused':
      return 'Valid · not opened';
    case 'in_app':
      return 'In app';
    case 'ended':
      return 'Ended';
    case 'revoked':
      return 'Revoked';
  }
}

export function stayOverlapsBedNightRange(
  stay: Pick<GuestStayRecord, 'bed_id' | 'check_in_at' | 'check_out_at' | 'revoked_at'>,
  bedId: string,
  checkInAt: string,
  checkOutAt: string
): boolean {
  if (stay.revoked_at || stay.bed_id !== bedId) return false;
  return guestAccessBedNightsOverlap(stay.check_in_at, stay.check_out_at, checkInAt, checkOutAt);
}

export function guestAccessCoversNight(
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'revoked_at'> & {
    check_in_date?: string | null;
    check_out_date?: string | null;
  },
  nightDate: string
): boolean {
  if (stay.revoked_at) return false;
  const start = stayRecordCheckInDate(stay);
  const end = stayRecordCheckOutDate(stay);
  return start <= nightDate && nightDate < end;
}

export type BedNightCellStatus = 'occupied' | 'scheduled';

export function resolveNightCellStatus(
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'revoked_at'> & {
    check_in_date?: string | null;
    check_out_date?: string | null;
  },
  nightDate: string,
  now: Date = new Date(),
  policy?: GuestAccessCheckInPolicy | null
): BedNightCellStatus | null {
  if (!guestAccessCoversNight(stay, nightDate)) return null;
  const inMs = resolveStayCheckInMs(stay, policy);
  if (Number.isFinite(inMs) && now.getTime() < inMs) return 'scheduled';
  return 'occupied';
}

export function guestAccessCheckInPolicyFromSettings(settings?: {
  checkInTime?: string | null;
  propertyTimeZone?: string | null;
} | null): GuestAccessCheckInPolicy {
  return {
    checkInTime: settings?.checkInTime,
    propertyTimeZone: settings?.propertyTimeZone,
  };
}
