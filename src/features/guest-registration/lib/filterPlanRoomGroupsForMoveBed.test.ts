import { describe, expect, it } from 'vitest';
import type { BedDayCalendarRoomGroup } from './resolveBedDayCalendar';
import { filterPlanRoomGroupsForMoveBed } from './filterPlanRoomGroupsForMoveBed';

function group(
  roomId: string,
  bedIds: string[]
): BedDayCalendarRoomGroup {
  return {
    roomId,
    roomLabel: roomId,
    rows: bedIds.map((bedId) => ({
      bedId,
      displayLabel: bedId,
      cells: [],
    })),
  };
}

describe('filterPlanRoomGroupsForMoveBed', () => {
  it('keeps current bed and target beds, drops the rest', () => {
    const groups = [
      group('a', ['bed-1', 'bed-2', 'bed-3']),
      group('b', ['bed-4']),
    ];
    const next = filterPlanRoomGroupsForMoveBed(groups, {
      currentBedId: 'bed-1',
      targetBedIds: new Set(['bed-3']),
    });
    expect(next.map((entry) => entry.roomId)).toEqual(['a']);
    expect(next[0]?.rows.map((row) => row.bedId)).toEqual(['bed-1', 'bed-3']);
  });

  it('keeps only current bed when there are no targets', () => {
    const groups = [group('a', ['bed-1', 'bed-2'])];
    const next = filterPlanRoomGroupsForMoveBed(groups, {
      currentBedId: 'bed-1',
      targetBedIds: new Set(),
    });
    expect(next[0]?.rows.map((row) => row.bedId)).toEqual(['bed-1']);
  });

  it('drops empty room groups', () => {
    const groups = [group('a', ['bed-1']), group('b', ['bed-2'])];
    const next = filterPlanRoomGroupsForMoveBed(groups, {
      currentBedId: 'bed-1',
      targetBedIds: new Set(['bed-1']),
    });
    expect(next.map((entry) => entry.roomId)).toEqual(['a']);
  });
});
