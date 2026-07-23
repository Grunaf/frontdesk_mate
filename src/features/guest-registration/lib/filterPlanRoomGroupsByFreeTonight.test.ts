import { describe, expect, it } from 'vitest';
import type { BedDayCalendarRoomGroup } from './resolveBedDayCalendar';
import {
  filterPlanRoomGroupsByFreeTonight,
  isBedRowFreeOnNight,
} from './filterPlanRoomGroupsByFreeTonight';

const groups: BedDayCalendarRoomGroup[] = [
  {
    roomId: 'room-a',
    roomLabel: 'Room A',
    rows: [
      {
        bedId: 'bed-1',
        displayLabel: '1',
        cells: [
          { nightDate: '2026-07-09', status: 'occupied' },
          { nightDate: '2026-07-10', status: 'free' },
        ],
      },
      {
        bedId: 'bed-2',
        displayLabel: '2',
        cells: [
          { nightDate: '2026-07-09', status: 'free' },
          { nightDate: '2026-07-10', status: 'occupied' },
        ],
      },
    ],
  },
  {
    roomId: 'room-b',
    roomLabel: 'Room B',
    rows: [
      {
        bedId: 'bed-3',
        displayLabel: '3',
        cells: [{ nightDate: '2026-07-09', status: 'occupied' }],
      },
    ],
  },
];

describe('filterPlanRoomGroupsByFreeTonight', () => {
  it('detects free cell on night', () => {
    expect(isBedRowFreeOnNight(groups[0]!.rows[1]!, '2026-07-09')).toBe(true);
    expect(isBedRowFreeOnNight(groups[0]!.rows[0]!, '2026-07-09')).toBe(false);
  });

  it('keeps only free beds and drops empty rooms', () => {
    const filtered = filterPlanRoomGroupsByFreeTonight(groups, '2026-07-09');

    expect(filtered).toEqual([
      {
        roomId: 'room-a',
        roomLabel: 'Room A',
        rows: [groups[0]!.rows[1]],
      },
    ]);
  });
});
