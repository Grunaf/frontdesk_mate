import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  isGuestAccessInWindow,
  resolveGuestAccessStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';

export type GuestAccessFormMode = 'walk-in' | 'custom';
export type IssuedAccessFilter = 'all' | 'today' | 'this_week';
export type IssuedAccessSection = 'in_app' | 'arriving_today' | 'scheduled' | 'other_active';

export interface GroupedIssuedAccess {
  inApp: GuestStayRecordWithLink[];
  arrivingToday: GuestStayRecordWithLink[];
  scheduled: GuestStayRecordWithLink[];
  otherActive: GuestStayRecordWithLink[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function defaultWalkInDates(now: Date = new Date()): { checkInDate: string; checkOutDate: string } {
  const checkInDate = todayUtcDate(now);
  const checkOutDate = addNights(checkInDate, 1);
  return { checkInDate, checkOutDate };
}

export function isValidAccessRange(from: string, until: string): boolean {
  if (!from || !until) return false;
  return until >= from;
}

export function countAccessNights(from: string, until: string): number {
  if (!isValidAccessRange(from, until)) return 0;
  const fromMs = parseUtcDate(from).getTime();
  const untilMs = parseUtcDate(until).getTime();
  return Math.round((untilMs - fromMs) / MS_PER_DAY);
}

export function addNights(from: string, nights: number): string {
  const date = parseUtcDate(from);
  date.setUTCDate(date.getUTCDate() + nights);
  return formatUtcDate(date);
}

export function clampUntilFromNights(from: string, nights: number): string {
  return addNights(from, Math.max(1, nights));
}

export function formatAccessNightsLabel(nights: number): string {
  return nights === 1 ? '1 night' : `${nights} nights`;
}

export function formatDisplayDate(isoDate: string): string {
  return parseUtcDate(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function sortByCheckIn(stays: GuestStayRecordWithLink[]): GuestStayRecordWithLink[] {
  return [...stays].sort(
    (a, b) => new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime()
  );
}

export function classifyIssuedAccessSection(
  stay: GuestStayRecordWithLink,
  now: Date = new Date()
): IssuedAccessSection | null {
  const status = resolveGuestAccessStatus(stay, now);
  if (status === 'ended' || status === 'revoked') return null;

  const today = todayUtcDate(now);
  const checkInDay = stay.check_in_at.slice(0, 10);

  if (status === 'in_app') return 'in_app';
  if (status === 'scheduled' && checkInDay === today) return 'arriving_today';
  if (status === 'scheduled') return 'scheduled';
  if (status === 'valid_unused' && checkInDay === today) return 'arriving_today';
  if (status === 'valid_unused') return 'other_active';
  return null;
}

export function groupIssuedAccess(
  stays: GuestStayRecordWithLink[],
  now: Date = new Date()
): GroupedIssuedAccess {
  const grouped: GroupedIssuedAccess = {
    inApp: [],
    arrivingToday: [],
    scheduled: [],
    otherActive: [],
  };

  for (const stay of stays) {
    const section = classifyIssuedAccessSection(stay, now);
    if (section === 'in_app') grouped.inApp.push(stay);
    else if (section === 'arriving_today') grouped.arrivingToday.push(stay);
    else if (section === 'scheduled') grouped.scheduled.push(stay);
    else if (section === 'other_active') grouped.otherActive.push(stay);
  }

  return {
    inApp: sortByCheckIn(grouped.inApp),
    arrivingToday: sortByCheckIn(grouped.arrivingToday),
    scheduled: sortByCheckIn(grouped.scheduled),
    otherActive: sortByCheckIn(grouped.otherActive),
  };
}

function getWeekBoundsUtc(now: Date): { weekStart: string; weekEnd: string } {
  const date = parseUtcDate(todayUtcDate(now));
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  const weekStart = formatUtcDate(date);
  date.setUTCDate(date.getUTCDate() + 6);
  const weekEnd = formatUtcDate(date);
  return { weekStart, weekEnd };
}

export function matchesIssuedAccessFilter(
  stay: GuestStayRecordWithLink,
  filter: IssuedAccessFilter,
  now: Date = new Date()
): boolean {
  if (filter === 'all') return true;

  const status = resolveGuestAccessStatus(stay, now);
  if (status === 'ended' || status === 'revoked') return false;

  const today = todayUtcDate(now);
  const from = stay.check_in_at.slice(0, 10);
  const until = stay.check_out_at.slice(0, 10);

  if (filter === 'today') {
    return isGuestAccessInWindow(stay, now) || from === today;
  }

  const { weekStart, weekEnd } = getWeekBoundsUtc(now);
  return (from >= weekStart && from <= weekEnd) || (until >= weekStart && until <= weekEnd);
}

export function filterIssuedAccess(
  stays: GuestStayRecordWithLink[],
  filter: IssuedAccessFilter,
  now: Date = new Date()
): GuestStayRecordWithLink[] {
  return stays.filter((stay) => matchesIssuedAccessFilter(stay, filter, now));
}
