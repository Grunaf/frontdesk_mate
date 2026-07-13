import { describe, expect, it } from 'vitest';
import { applyOwnerTenantSavePolicy } from './applyOwnerTenantSavePolicy';

describe('applyOwnerTenantSavePolicy', () => {
  it('strips legacy deskPinHash from merged reception', () => {
    const previous = {
      reception: { open: '08:00', deskPinHash: 'hash-from-db' },
      wifi: { name: 'OldWifi', password: 'old' },
    };
    const merged = {
      reception: { open: '09:00', deskPinHash: 'tampered-hash' },
      wifi: { name: 'NewWifi', password: 'new' },
    };

    expect(applyOwnerTenantSavePolicy(merged, previous)).toEqual({
      reception: { open: '09:00' },
      wifi: { name: 'NewWifi', password: 'new' },
    });
  });

  it('does not keep deskPinHash when previous had one', () => {
    const previous = { reception: { open: '08:00', deskPinHash: 'stored' } };
    const merged = {
      reception: { open: '09:00' },
    };

    expect(applyOwnerTenantSavePolicy(merged, previous)).toEqual({
      reception: { open: '09:00' },
    });
  });

  it('returns merged with deskPinHash stripped when previous is undefined', () => {
    const merged = {
      wifi: { name: 'Guest' },
      reception: { open: '08:00', deskPinHash: 'legacy' },
    };
    expect(applyOwnerTenantSavePolicy(merged, undefined)).toEqual({
      wifi: { name: 'Guest' },
      reception: { open: '08:00' },
    });
  });

  it('allows owner overlays hostelPlaces and cityPackNeedNowPlaceIds through policy', () => {
    const previous = {
      hostelPlaces: [{ id: 'h1', name: 'Old shop', category: 'shop' as const }],
      cityPackNeedNowPlaceIds: ['atm-1'],
    };
    const merged = {
      hostelPlaces: [{ id: 'h2', name: 'New cafe', category: 'food' as const }],
      cityPackNeedNowPlaceIds: ['atm-1', 'pharm-1'],
    };

    expect(applyOwnerTenantSavePolicy(merged, previous)).toEqual(merged);
  });
});
