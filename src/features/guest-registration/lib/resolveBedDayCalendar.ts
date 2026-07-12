import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  guestAccessCoversNight,
  guestAccessCheckInPolicyFromSettings,
  resolveNightCellStatus,
  type BedNightCellStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import { resolveBedDisplayLabel } from '@/entities/tenant/lib/resolveBedDisplay';
import { resolveBedInventory, type BedInventoryRoomGroup } from './resolveBedInventory';
import { addNights, todayUtcDate } from './guestAccessDates';

export type BedDayCalendarView = 'week' | 'month';

export interface BedDayCalendarCell {
  nightDate: string;
  status: 'free' | BedNightCellStatus;
  stay?: GuestStayRecordWithLink;
}

export interface BedDayCalendarRow {
  bedId: string;
  displayLabel: string;
  cells: BedDayCalendarCell[];
}

export interface BedDayCalendarRoomGroup {
  roomId: string;
  roomLabel: string;
  rows: BedDayCalendarRow[];
}

export interface BedDayCalendarSnapshot {
  rangeStart: string;
  rangeEnd: string;
  days: string[];
  roomGroups: BedDayCalendarRoomGroup[];
}

function parseUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekRangeStart(date: string): string {
  const parsed = parseUtcDate(date);
  const day = parsed.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  parsed.setUTCDate(parsed.getUTCDate() + diffToMonday);
  return formatUtcDate(parsed);
}

export function listCalendarDays(rangeStart: string, dayCount: number): string[] {
  const days: string[] = [];
  for (let index = 0; index < dayCount; index += 1) {
    days.push(addNights(rangeStart, index));
  }
  return days;
}

export function resolveCalendarRange(
  view: BedDayCalendarView,
  anchorDate: string
): { rangeStart: string; rangeEnd: string; days: string[] } {
  const rangeStart = view === 'week' ? getWeekRangeStart(anchorDate) : `${anchorDate.slice(0, 8)}01`;
  const dayCount = view === 'week' ? 7 : daysInMonth(rangeStart);
  const days = listCalendarDays(rangeStart, dayCount);
  return {
    rangeStart,
    rangeEnd: days[days.length - 1] ?? rangeStart,
    days,
  };
}

function daysInMonth(monthStart: string): number {
  const date = parseUtcDate(monthStart);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function findStayForNight(
  bedId: string,
  nightDate: string,
  stays: GuestStayRecordWithLink[]
): GuestStayRecordWithLink | undefined {
  return stays.find((stay) => stay.bed_id === bedId && guestAccessCoversNight(stay, nightDate));
}

function buildRow(
  settings: TenantSettings,
  bedId: string,
  days: string[],
  stays: GuestStayRecordWithLink[],
  now: Date
): BedDayCalendarRow {
  return {
    bedId,
    displayLabel: resolveBedDisplayLabel(settings, bedId) ?? bedId,
    cells: days.map((nightDate) => {
      const stay = findStayForNight(bedId, nightDate, stays);
      if (!stay) {
        return { nightDate, status: 'free' as const };
      }

      const policy = guestAccessCheckInPolicyFromSettings(settings);
      const status = resolveNightCellStatus(stay, nightDate, now, policy) ?? 'occupied';
      return { nightDate, status, stay };
    }),
  };
}

export function resolveBedDayCalendar(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[],
  view: BedDayCalendarView,
  anchorDate: string = todayUtcDate(),
  now: Date = new Date()
): BedDayCalendarSnapshot {
  const inventory = resolveBedInventory(settings, stays, now);
  const { rangeStart, rangeEnd, days } = resolveCalendarRange(view, anchorDate);
  const activeStays = stays.filter((stay) => !stay.revoked_at);
  const configuredBedIds = new Set(listGuestStayBedIds(settings));

  const roomGroups: BedDayCalendarRoomGroup[] = inventory.roomGroups.map((group) => ({
    roomId: group.roomId,
    roomLabel: group.roomLabel,
    rows: group.beds.map((bed) => buildRow(settings, bed.bedId, days, activeStays, now)),
  }));

  const orphanStays = activeStays.filter((stay) => !configuredBedIds.has(stay.bed_id));
  if (orphanStays.length > 0) {
    const orphanBedIds = [...new Set(orphanStays.map((stay) => stay.bed_id))];
    roomGroups.push({
      roomId: '__orphan__',
      roomLabel: 'Unknown beds',
      rows: orphanBedIds.map((bedId) => buildRow(settings, bedId, days, activeStays, now)),
    });
  }

  return { rangeStart, rangeEnd, days, roomGroups };
}

export function formatCalendarRangeLabel(rangeStart: string, rangeEnd: string): string {
  const start = parseUtcDate(rangeStart).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const end = parseUtcDate(rangeEnd).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${start} – ${end}`;
}

export function shiftCalendarAnchor(
  anchorDate: string,
  view: BedDayCalendarView,
  direction: -1 | 0 | 1
): string {
  if (direction === 0) {
    return todayUtcDate();
  }

  if (view === 'week') {
    return addNights(getWeekRangeStart(anchorDate), direction * 7);
  }

  const date = parseUtcDate(`${anchorDate.slice(0, 8)}01`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return formatUtcDate(date);
}

export function flattenCalendarRoomGroups(
  roomGroups: BedDayCalendarRoomGroup[]
): BedDayCalendarRoomGroup['rows'] {
  return roomGroups.flatMap((group) => group.rows);
}
