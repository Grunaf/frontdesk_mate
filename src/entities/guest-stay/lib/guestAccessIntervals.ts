import type { GuestStayRecord } from '../model/types';

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
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'revoked_at'>,
  now: Date = new Date()
): boolean {
  if (stay.revoked_at) return false;
  const nowMs = now.getTime();
  return (
    nowMs >= new Date(stay.check_in_at).getTime() && nowMs <= new Date(stay.check_out_at).getTime()
  );
}

export type GuestAccessStatus = 'scheduled' | 'valid_unused' | 'in_app' | 'ended' | 'revoked';

export function resolveGuestAccessStatus(
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'activated_at' | 'revoked_at'>,
  now: Date = new Date()
): GuestAccessStatus {
  if (stay.revoked_at) return 'revoked';
  const nowMs = now.getTime();
  const outMs = new Date(stay.check_out_at).getTime();
  const inMs = new Date(stay.check_in_at).getTime();
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
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'revoked_at'>,
  nightDate: string
): boolean {
  if (stay.revoked_at) return false;
  const start = stay.check_in_at.slice(0, 10);
  const end = stay.check_out_at.slice(0, 10);
  return start <= nightDate && nightDate < end;
}

export type BedNightCellStatus = 'occupied' | 'scheduled';

export function resolveNightCellStatus(
  stay: Pick<GuestStayRecord, 'check_in_at' | 'check_out_at' | 'revoked_at'>,
  nightDate: string,
  now: Date = new Date()
): BedNightCellStatus | null {
  if (!guestAccessCoversNight(stay, nightDate)) return null;
  if (now.getTime() < new Date(stay.check_in_at).getTime()) return 'scheduled';
  return 'occupied';
}
