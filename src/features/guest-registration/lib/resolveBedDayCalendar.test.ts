import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  getWeekRangeStart,
  listCalendarDays,
  resolveBedDayCalendar,
  resolveCalendarRange,
} from './resolveBedDayCalendar';

const settings: TenantSettings = {
  guestStay: {
    rooms: [{ id: 'room-a', label: 'Room A', floorId: 'floor-1' }],
    beds: [{ id: 'bed-1', roomId: 'room-a' }, { id: 'bed-2', roomId: 'room-a' }],
  },
};

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return {
    id: 'stay-1',
    tenant_id: 'tenant-1',
    tenant_slug: 'demo',
    bed_id: 'bed-1',
    guest_name: 'Alex',
    check_in_at: '2026-06-22T14:00:00.000Z',
    check_out_at: '2026-06-25T23:59:59.999Z',
    activated_at: '2026-06-22T15:00:00.000Z',
    desk_checked_in_at: null,
    key_issued_at: null,
    passport_checked_at: null,
    tax_collected_at: null,
    revoked_at: null,
    created_at: '2026-06-22T10:00:00.000Z',
    magicLinkUrl: null,
    ...overrides,
  };
}

describe('resolveBedDayCalendar', () => {
  it('builds a 7-day week range from Monday', () => {
    expect(getWeekRangeStart('2026-06-22')).toBe('2026-06-22');
    expect(listCalendarDays('2026-06-22', 7)).toEqual([
      '2026-06-22',
      '2026-06-23',
      '2026-06-24',
      '2026-06-25',
      '2026-06-26',
      '2026-06-27',
      '2026-06-28',
    ]);
  });

  it('marks occupied and scheduled nights on the grid', () => {
    const now = new Date('2026-06-23T12:00:00.000Z');
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
      '2026-06-22',
      now
    );

    const bed1Wednesday = snapshot.roomGroups[0]?.rows[0]?.cells[1];
    const bed2Saturday = snapshot.roomGroups[0]?.rows[1]?.cells[6];

    expect(bed1Wednesday).toEqual(
      expect.objectContaining({
        nightDate: '2026-06-23',
        status: 'occupied',
      })
    );
    expect(bed2Saturday).toEqual(
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
