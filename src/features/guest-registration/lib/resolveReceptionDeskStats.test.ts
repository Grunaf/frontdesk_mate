import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';
import { formatReceptionDeskStats, resolveReceptionDeskStats } from './resolveReceptionDeskStats';

const now = new Date('2026-06-22T12:00:00.000Z');

const settings: TenantSettings = {
  guestStay: {
    rooms: [{ id: 'room-a', label: 'Room A', floorId: 'floor-1' }],
    beds: [{ id: 'bed-1', roomId: 'room-a' }, { id: 'bed-2', roomId: 'room-a' }],
  },
};

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture(overrides);
}


describe('resolveReceptionDeskStats', () => {
  it('counts beds occupied for tonight and arriving-today guests', () => {
    const stays = [
      makeStay({ activated_at: '2026-06-20T10:00:00.000Z', check_in_at: '2026-06-20T14:00:00.000Z' }),
      makeStay({
        id: 'stay-2',
        bed_id: 'bed-2',
        guest_name: 'Sam',
        check_in_at: '2026-06-22T14:00:00.000Z',
      }),
    ];
    const stats = resolveReceptionDeskStats(settings, stays, now);

    expect(stats.inUse).toBe(2);
    expect(stats.free).toBe(0);
    expect(stats.arrivingToday).toBe(1);
    expect(formatReceptionDeskStats(stats)).toBe('2 in use · 0 free · 1 arriving today');
  });

  it('does not count tomorrow-only stays as in use tonight', () => {
    const stays = [
      makeStay({
        id: 'stay-tomorrow',
        bed_id: 'bed-1',
        check_in_at: '2026-06-23T14:00:00.000Z',
        check_out_at: '2026-06-25T23:59:59.999Z',
      }),
    ];
    const stats = resolveReceptionDeskStats(settings, stays, now);

    expect(stats.inUse).toBe(0);
    expect(stats.free).toBe(2);
  });
});
