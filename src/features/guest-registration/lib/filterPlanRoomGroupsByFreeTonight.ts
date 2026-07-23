import type { BedDayCalendarRoomGroup, BedDayCalendarRow } from './resolveBedDayCalendar';

export type PlanBedFilter = 'all' | 'free_tonight';

export function isBedRowFreeOnNight(row: BedDayCalendarRow, nightDate: string): boolean {
  const cell = row.cells.find((entry) => entry.nightDate === nightDate);
  return cell?.status === 'free';
}

/** Keep only beds free on `nightDate`; drop empty room groups. */
export function filterPlanRoomGroupsByFreeTonight(
  roomGroups: BedDayCalendarRoomGroup[],
  nightDate: string
): BedDayCalendarRoomGroup[] {
  return roomGroups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => isBedRowFreeOnNight(row, nightDate)),
    }))
    .filter((group) => group.rows.length > 0);
}
