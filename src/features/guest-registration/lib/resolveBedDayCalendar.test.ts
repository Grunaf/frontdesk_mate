import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';
import {
  listCalendarDays,
  resolveBedDayCalendar,
  resolveCalendarRange,
  shiftCalendarAnchor,
} from './resolveBedDayCalendar';

const settings: TenantSettings = {
  guestStay: {
    rooms: [{ id: 'room-a', label: 'Room A', floorId: 'floor-1' }],
    beds: [{ id: 'bed-1', roomId: 'room-a' }, { id: 'bed-2', roomId: 'room-a' }],
  },
};

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture({
    activated_at: '2026-06-22T15:00:00.000Z',
    magicLinkUrl: null,
    ...overrides,
  });
}

describe('resolveBedDayCalendar', () => {
  it('rolling week starts yesterday relative to anchor', () => {
    const range = resolveCalendarRange('week', '2026-07-26');
    expect(range.rangeStart).toBe('2026-07-25');
    expect(range.rangeEnd).toBe('2026-07-31');
    expect(range.days).toEqual([
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
    ]);
    expect(listCalendarDays('2026-07-25', 7)).toEqual(range.days);
  });

  it('shifts week anchor by ±7 days without aligning to Monday', () => {
    expect(shiftCalendarAnchor('2026-07-26', 'week', -1)).toBe('2026-07-19');
    expect(shiftCalendarAnchor('2026-07-26', 'week', 1)).toBe('2026-08-02');
    expect(resolveCalendarRange('week', '2026-07-19').rangeStart).toBe('2026-07-18');
    expect(resolveCalendarRange('week', '2026-08-02').rangeStart).toBe('2026-08-01');
  });

  it('marks occupied and scheduled nights on the grid', () => {
    const now = new Date('2026-06-23T12:00:00.000Z');
    // Rolling week for anchor 2026-06-24: 23 … 29
    const snapshot = resolveBedDayCalendar(
      settings,
      [
        makeStay(),
        makeStay({
          id: 'stay-2',
          bed_id: 'bed-2',
          guest_name: 'Sam',
          check_in_at: '2026-06-28T14:00:00.000Z',
          check_out_at: '2026-06-30T23:59:59.999Z',
          activated_at: null,
        }),
      ],
      'week',
      '2026-06-24',
      now
    );

    const bed1Occupied = snapshot.roomGroups[0]?.rows[0]?.cells.find(
      (cell) => cell.nightDate === '2026-06-23'
    );
    const bed2Scheduled = snapshot.roomGroups[0]?.rows[1]?.cells.find(
      (cell) => cell.nightDate === '2026-06-28'
    );

    expect(bed1Occupied).toEqual(
      expect.objectContaining({
        nightDate: '2026-06-23',
        status: 'occupied',
      })
    );
    expect(bed2Scheduled).toEqual(
      expect.objectContaining({
        nightDate: '2026-06-28',
        status: 'scheduled',
      })
    );
  });

  it('builds a month view from the first day of the month', () => {
    const range = resolveCalendarRange('month', '2026-06-22');
    expect(range.rangeStart).toBe('2026-06-01');
    expect(range.days).toHaveLength(30);
  });
});
