import { describe, expect, it } from 'vitest';
import { flattenBedInventory, resolveBedInventory } from './resolveBedInventory';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';

const inventoryNow = new Date('2026-06-23T12:00:00.000Z');
const tonight = '2026-06-23';
const tomorrowNight = '2026-06-24';

function makeStay(bedId: string, overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture({ id: `stay-${bedId}`, bed_id: bedId, ...overrides });
}


const settings: TenantSettings = {
  guestStay: {
    rooms: [
      { id: 'room-a', label: 'A', floorId: 'floor-1' },
      { id: 'room-b', label: 'B', floorId: 'floor-1' },
    ],
    beds: [
      { id: 'bed-1', roomId: 'room-a', bedType: 'bunk', topId: 'bed-1-top', bottomId: 'bed-1-bottom' },
      { id: 'bed-2', roomId: 'room-a' },
      { id: 'bed-3', roomId: 'room-b' },
    ],
  },
};

function resolveTonight(stays: GuestStayRecordWithLink[]) {
  return resolveBedInventory(settings, stays, { nightDate: tonight, now: inventoryNow });
}

describe('resolveBedInventory', () => {
  it('groups beds by room in configured order', () => {
    const snapshot = resolveTonight([makeStay('bed-1-top')]);

    expect(snapshot.roomGroups.map((group) => group.roomLabel)).toEqual(['A', 'B']);
    expect(snapshot.roomGroups[0]?.beds.map((entry) => entry.bedId)).toEqual([
      'bed-1-top',
      'bed-1-bottom',
      'bed-2',
    ]);
    expect(snapshot.roomGroups[1]?.beds.map((entry) => entry.bedId)).toEqual(['bed-3']);
  });

  it('marks bed occupied when stay covers the selected night', () => {
    const snapshot = resolveTonight([makeStay('bed-1-top')]);
    const top = snapshot.roomGroups[0]?.beds.find((entry) => entry.bedId === 'bed-1-top');

    expect(top).toEqual(
      expect.objectContaining({
        bedId: 'bed-1-top',
        displayLabel: 'Room A · Bed 1 · Upper',
        status: 'occupied',
        nightCellStatus: 'occupied',
      })
    );
  });

  it('shows guest on tonight before check-in time as scheduled', () => {
    const snapshot = resolveTonight([
      makeStay('bed-2', {
        check_in_at: '2026-06-23T14:00:00.000Z',
        check_out_at: '2026-06-25T23:59:59.999Z',
      }),
    ]);

    const bed2 = snapshot.roomGroups[0]?.beds.find((entry) => entry.bedId === 'bed-2');
    expect(bed2).toEqual(
      expect.objectContaining({
        status: 'occupied',
        nightCellStatus: 'scheduled',
        stay: expect.objectContaining({ guest_name: 'Alex' }),
      })
    );
  });

  it('keeps multi-night stays occupied on each covered night', () => {
    const stay = makeStay('bed-2');
    const nights = ['2026-06-22', '2026-06-23', '2026-06-24'] as const;

    for (const nightDate of nights) {
      const snapshot = resolveBedInventory(settings, [stay], { nightDate, now: inventoryNow });
      const bed2 = flattenBedInventory(snapshot).find((entry) => entry.bedId === 'bed-2');
      expect(bed2?.status).toBe('occupied');
    }

    const afterStay = resolveBedInventory(settings, [stay], {
      nightDate: '2026-06-25',
      now: inventoryNow,
    });
    expect(flattenBedInventory(afterStay).find((entry) => entry.bedId === 'bed-2')?.status).toBe(
      'free'
    );
  });

  it('shows tomorrow-only stay as free tonight with next access hint', () => {
    const stay = makeStay('bed-2', {
      check_in_at: '2026-06-24T14:00:00.000Z',
      check_out_at: '2026-06-26T23:59:59.999Z',
    });

    const tonightSnapshot = resolveBedInventory(settings, [stay], {
      nightDate: tonight,
      now: inventoryNow,
    });
    const tonightBed = flattenBedInventory(tonightSnapshot).find((entry) => entry.bedId === 'bed-2');
    expect(tonightBed).toEqual(
      expect.objectContaining({
        status: 'free',
        nextAccess: expect.objectContaining({ id: stay.id }),
      })
    );

    const tomorrowSnapshot = resolveBedInventory(settings, [stay], {
      nightDate: tomorrowNight,
      now: inventoryNow,
    });
    const tomorrowBed = flattenBedInventory(tomorrowSnapshot).find((entry) => entry.bedId === 'bed-2');
    expect(tomorrowBed).toEqual(
      expect.objectContaining({
        status: 'occupied',
        stay: expect.objectContaining({ id: stay.id }),
      })
    );
  });

  it('shows scheduled next access on a free bed for a later night', () => {
    const snapshot = resolveTonight([
      makeStay('bed-2', {
        check_in_at: '2026-06-28T14:00:00.000Z',
        check_out_at: '2026-06-30T23:59:59.999Z',
      }),
    ]);

    const bed2 = snapshot.roomGroups[0]?.beds.find((entry) => entry.bedId === 'bed-2');
    expect(bed2).toEqual(
      expect.objectContaining({
        status: 'free',
        nextAccess: expect.objectContaining({ bed_id: 'bed-2' }),
      })
    );
  });

  it('returns orphan stays for unknown beds on the selected night only', () => {
    const orphanTonight = makeStay('legacy-bed');
    const orphanLater = makeStay('legacy-bed', {
      id: 'stay-legacy-later',
      check_in_at: '2026-06-28T14:00:00.000Z',
      check_out_at: '2026-06-30T23:59:59.999Z',
    });

    expect(resolveTonight([orphanTonight]).orphanStays).toEqual([orphanTonight]);
    expect(resolveTonight([orphanLater]).orphanStays).toEqual([]);
  });

  it('keeps revoked-access stays for bed-night occupancy (lived after checkout)', () => {
    const snapshot = resolveTonight([
      makeStay('bed-2', { revoked_at: '2026-06-22T12:00:00.000Z' }),
    ]);

    const bed2 = flattenBedInventory(snapshot).find((entry) => entry.bedId === 'bed-2');
    expect(bed2).toEqual(
      expect.objectContaining({
        bedId: 'bed-2',
        status: 'occupied',
      })
    );
  });

  it('ignores archived stays for occupancy', () => {
    const snapshot = resolveTonight([
      makeStay('bed-2', { is_archived: true }),
    ]);

    const bed2 = flattenBedInventory(snapshot).find((entry) => entry.bedId === 'bed-2');
    expect(bed2).toEqual(
      expect.objectContaining({
        bedId: 'bed-2',
        status: 'free',
      })
    );
  });

  it('puts beds without room mapping into Unassigned', () => {
    const snapshot = resolveBedInventory(
      {
        guestStay: {
          beds: [{ id: 'solo-bed', roomId: '' }],
        },
      },
      [],
      { nightDate: tonight, now: inventoryNow }
    );

    expect(snapshot.roomGroups).toEqual([
      expect.objectContaining({
        roomLabel: 'Unassigned',
        beds: [expect.objectContaining({ bedId: 'solo-bed' })],
      }),
    ]);
  });
});
