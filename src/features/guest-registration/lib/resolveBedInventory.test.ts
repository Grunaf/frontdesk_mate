import { describe, expect, it } from 'vitest';
import { flattenBedInventory, resolveBedInventory } from './resolveBedInventory';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';

const inventoryNow = new Date('2026-06-23T12:00:00.000Z');

function makeStay(bedId: string, overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return {
    id: `stay-${bedId}`,
    tenant_id: 'tenant-1',
    tenant_slug: 'demo',
    bed_id: bedId,
    guest_name: 'Alex',
    check_in_at: '2026-06-22T14:00:00.000Z',
    check_out_at: '2026-06-25T23:59:59.999Z',
    activated_at: null,
    revoked_at: null,
    created_at: '2026-06-22T10:00:00.000Z',
    magicLinkUrl: 'https://example.com/check-in',
    ...overrides,
  };
}

const settings: TenantSettings = {
  guestStay: {
    rooms: [
      { id: 'room-a', label: 'Room A', floorId: 'floor-1' },
      { id: 'room-b', label: 'Room B', floorId: 'floor-1' },
    ],
    beds: [
      { id: 'bed-1', roomId: 'room-a', bedType: 'bunk', topId: 'bed-1-top', bottomId: 'bed-1-bottom' },
      { id: 'bed-2', roomId: 'room-a' },
      { id: 'bed-3', roomId: 'room-b' },
    ],
  },
};

describe('resolveBedInventory', () => {
  it('groups beds by room in configured order', () => {
    const snapshot = resolveBedInventory(settings, [makeStay('bed-1-top')], inventoryNow);

    expect(snapshot.roomGroups.map((group) => group.roomLabel)).toEqual(['Room A', 'Room B']);
    expect(snapshot.roomGroups[0]?.beds.map((entry) => entry.bedId)).toEqual([
      'bed-1-top',
      'bed-1-bottom',
      'bed-2',
    ]);
    expect(snapshot.roomGroups[1]?.beds.map((entry) => entry.bedId)).toEqual(['bed-3']);
  });

  it('marks beds in use when access is valid now', () => {
    const snapshot = resolveBedInventory(settings, [makeStay('bed-1-top')], inventoryNow);
    const top = snapshot.roomGroups[0]?.beds.find((entry) => entry.bedId === 'bed-1-top');

    expect(top).toEqual(
      expect.objectContaining({
        bedId: 'bed-1-top',
        displayLabel: '1 · Upper',
        status: 'occupied',
      })
    );
  });

  it('shows scheduled next access on a free bed', () => {
    const snapshot = resolveBedInventory(
      settings,
      [
        makeStay('bed-2', {
          check_in_at: '2026-06-28T14:00:00.000Z',
          check_out_at: '2026-06-30T23:59:59.999Z',
        }),
      ],
      inventoryNow
    );

    const bed2 = snapshot.roomGroups[0]?.beds.find((entry) => entry.bedId === 'bed-2');
    expect(bed2).toEqual(
      expect.objectContaining({
        status: 'free',
        nextAccess: expect.objectContaining({ bed_id: 'bed-2' }),
      })
    );
  });

  it('returns orphan stays for beds missing from room map config', () => {
    const orphan = makeStay('legacy-bed');
    const snapshot = resolveBedInventory(settings, [orphan], inventoryNow);

    expect(snapshot.orphanStays).toEqual([orphan]);
  });

  it('ignores revoked stays', () => {
    const snapshot = resolveBedInventory(
      settings,
      [makeStay('bed-2', { revoked_at: '2026-06-22T12:00:00.000Z' })],
      inventoryNow
    );

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
          beds: [{ id: 'solo-bed' }],
        },
      },
      [],
      inventoryNow
    );

    expect(snapshot.roomGroups).toEqual([
      expect.objectContaining({
        roomLabel: 'Unassigned',
        beds: [expect.objectContaining({ bedId: 'solo-bed' })],
      }),
    ]);
  });
});
