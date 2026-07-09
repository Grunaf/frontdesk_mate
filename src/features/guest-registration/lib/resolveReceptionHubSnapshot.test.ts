import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  classifyReceptionHubStay,
  resolveReceptionHubSnapshot,
} from './resolveReceptionHubSnapshot';

const settings: TenantSettings = {
  operationalDayStartTime: '08:00',
  guestStay: {
    rooms: [{ id: 'room-a', label: 'Room A', floorId: 'floor-1' }],
    beds: [
      { id: 'bed-1', roomId: 'room-a' },
      { id: 'bed-2', roomId: 'room-a' },
    ],
  },
};

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return {
    id: 'stay-1',
    tenant_id: 'tenant-1',
    tenant_slug: 'demo',
    bed_id: 'bed-1',
    guest_name: 'Alex',
    check_in_at: '2026-07-08T14:00:00.000Z',
    check_out_at: '2026-07-10T23:59:59.999Z',
    activated_at: null,
    desk_checked_in_at: null,
    key_issued_at: null,
    passport_checked_at: null,
    tax_collected_at: null,
    revoked_at: null,
    created_at: '2026-07-08T10:00:00.000Z',
    magicLinkUrl: 'https://example.com/check-in',
    ...overrides,
  };
}

describe('resolveReceptionHubSnapshot', () => {
  it('classifies expected today on current operational date', () => {
    const now = new Date('2026-07-09T07:59:00.000Z');
    const stay = makeStay({ check_in_at: '2026-07-08T14:00:00.000Z' });

    expect(
      classifyReceptionHubStay(stay, {
        operationalDate: '2026-07-08',
        now,
        operationalDayStartTime: '08:00',
      })
    ).toBe('expectedToday');
  });

  it('keeps prior-day check-in in still expected before operational rollover', () => {
    const now = new Date('2026-07-09T07:59:00.000Z');
    const stay = makeStay({
      id: 'stay-old',
      check_in_at: '2026-07-07T14:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-08');
    expect(snapshot.stillExpected.map((entry) => entry.id)).toEqual(['stay-old']);
    expect(snapshot.noShow).toEqual([]);
  });

  it('moves same stay to no-show after operational day start', () => {
    const stay = makeStay({ check_in_at: '2026-07-08T14:00:00.000Z' });
    const beforeRollover = resolveReceptionHubSnapshot(settings, [stay], new Date('2026-07-09T07:59:00.000Z'));
    const afterRollover = resolveReceptionHubSnapshot(settings, [stay], new Date('2026-07-09T08:00:00.000Z'));

    expect(beforeRollover.expectedToday.map((entry) => entry.id)).toEqual(['stay-1']);
    expect(afterRollover.noShow.map((entry) => entry.id)).toEqual(['stay-1']);
    expect(afterRollover.expectedToday).toEqual([]);
  });

  it('excludes desk-checked-in guests from arrival buckets', () => {
    const now = new Date('2026-07-09T08:30:00.000Z');
    const stay = makeStay({
      check_in_at: '2026-07-09T14:00:00.000Z',
      desk_checked_in_at: '2026-07-09T09:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.expectedToday).toEqual([]);
    expect(snapshot.noShow).toEqual([]);
  });

  it('keeps guest in arrival buckets when only guest app is open', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const stay = makeStay({
      check_in_at: '2026-07-09T14:00:00.000Z',
      activated_at: '2026-07-09T09:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [stay], now);

    expect(snapshot.expectedToday.map((entry) => entry.id)).toEqual(['stay-1']);
  });

  it('lists free beds for operational night excluding occupied reservations', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const occupied = makeStay({ bed_id: 'bed-1', check_in_at: '2026-07-09T14:00:00.000Z' });

    const snapshot = resolveReceptionHubSnapshot(settings, [occupied], now);

    expect(snapshot.operational.operationalDate).toBe('2026-07-09');
    expect(snapshot.freeBedEntries.map((entry) => entry.bedId)).toEqual(['bed-2']);
    expect(snapshot.freeBedRoomGroups[0]?.beds.map((entry) => entry.bedId)).toEqual(['bed-2']);
  });

  it('surfaces orphan stays for unknown beds on operational night', () => {
    const now = new Date('2026-07-09T10:00:00.000Z');
    const orphan = makeStay({
      bed_id: 'unknown-bed',
      check_in_at: '2026-07-09T14:00:00.000Z',
    });

    const snapshot = resolveReceptionHubSnapshot(settings, [orphan], now);

    expect(snapshot.orphanStays).toEqual([orphan]);
  });
});
