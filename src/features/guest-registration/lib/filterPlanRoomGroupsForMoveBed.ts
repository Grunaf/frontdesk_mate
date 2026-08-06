import type { BedDayCalendarRoomGroup } from './resolveBedDayCalendar';

/**
 * Move bed pickBed: keep current bed row + rows with a valid vertical drop target.
 * Drops empty room groups.
 */
export function filterPlanRoomGroupsForMoveBed(
  roomGroups: BedDayCalendarRoomGroup[],
  input: {
    currentBedId: string;
    targetBedIds: ReadonlySet<string>;
  }
): BedDayCalendarRoomGroup[] {
  const currentBedId = input.currentBedId.trim();
  return roomGroups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) => row.bedId === currentBedId || input.targetBedIds.has(row.bedId)
      ),
    }))
    .filter((group) => group.rows.length > 0);
}
