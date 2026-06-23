import { describe, expect, it } from 'vitest';
import { resolveBedInventory } from './resolveBedInventory';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';

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
    beds: [
      { id: 'bed-1', roomId: 'room-a', topId: 'bed-1-top', bottomId: 'bed-1-bottom' },
      { id: 'bed-2', roomId: 'room-a' },
    ],
  },
};

describe('resolveBedInventory', () => {
  it('marks configured beds as free or occupied', () => {
    const snapshot = resolveBedInventory(settings, [makeStay('bed-1-top')]);

    expect(snapshot.beds).toEqual([
      { bedId: 'bed-1', status: 'free' },
      { bedId: 'bed-1-bottom', status: 'free' },
      { bedId: 'bed-1-top', status: 'occupied', stay: expect.objectContaining({ bed_id: 'bed-1-top' }) },
      { bedId: 'bed-2', status: 'free' },
    ]);
  });

  it('returns orphan stays for beds missing from room map config', () => {
    const orphan = makeStay('legacy-bed');
    const snapshot = resolveBedInventory(settings, [orphan]);

    expect(snapshot.orphanStays).toEqual([orphan]);
  });

  it('ignores revoked stays', () => {
    const snapshot = resolveBedInventory(settings, [
      makeStay('bed-2', { revoked_at: '2026-06-22T12:00:00.000Z' }),
    ]);

    expect(snapshot.beds.find((entry) => entry.bedId === 'bed-2')).toEqual({
      bedId: 'bed-2',
      status: 'free',
    });
  });
});
