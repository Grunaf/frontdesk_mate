import { describe, expect, it } from 'vitest';
import { applyOwnerTenantSavePolicy } from './applyOwnerTenantSavePolicy';

describe('applyOwnerTenantSavePolicy', () => {
  it('keeps deskPinHash from previous when form merge tries to change it', () => {
    const previous = {
      reception: { open: '08:00', deskPinHash: 'hash-from-db' },
      wifi: { name: 'OldWifi', password: 'old' },
    };
    const merged = {
      reception: { open: '09:00', deskPinHash: 'tampered-hash' },
      wifi: { name: 'NewWifi', password: 'new' },
    };

    expect(applyOwnerTenantSavePolicy(merged, previous)).toEqual({
      reception: { open: '09:00', deskPinHash: 'hash-from-db' },
      wifi: { name: 'NewWifi', password: 'new' },
    });
  });

  it('does not inject deskPinHash when previous had none', () => {
    const previous = { reception: { open: '08:00' } };
    const merged = {
      reception: { open: '09:00', deskPinHash: 'injected' },
    };

    expect(applyOwnerTenantSavePolicy(merged, previous)).toEqual({
      reception: { open: '09:00', deskPinHash: undefined },
    });
  });

  it('returns merged unchanged when previous is undefined', () => {
    const merged = { wifi: { name: 'Guest' } };
    expect(applyOwnerTenantSavePolicy(merged, undefined)).toEqual(merged);
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
