import { describe, expect, it } from 'vitest';
import {
  listBedIdsForStayOffer,
  listReceptionStayOfferOptions,
  pickAvailableBedForStayOffer,
  resolveOfferIdForBed,
} from './pickAvailableBedForStayOffer';
import type { TenantSettings } from '@/entities/tenant';

const settings: TenantSettings = {
  stayOffers: [
    { id: 'female', title: 'Female dorm' },
    { id: 'private', title: 'Private' },
  ],
  guestStay: {
    rooms: [
      { id: 'r1', label: '1', floorId: '1', offerId: 'female' },
      { id: 'r2', label: '2', floorId: '1', offerId: 'female' },
      { id: 'r3', label: 'P', floorId: '1', offerId: 'private' },
    ],
    beds: [
      { id: 'f1', roomId: 'r1' },
      { id: 'f2', roomId: 'r2' },
      { id: 'p1', roomId: 'r3' },
    ],
  },
};

describe('pickAvailableBedForStayOffer', () => {
  it('lists beds in rooms linked to the offer', () => {
    expect(listBedIdsForStayOffer(settings, 'female')).toEqual(['f1', 'f2']);
  });

  it('picks first available bed in offer pool order', () => {
    expect(
      pickAvailableBedForStayOffer({
        settings,
        offerId: 'female',
        availableBedIds: ['f2', 'p1'],
      })
    ).toBe('f2');
  });

  it('returns null when no beds free in offer', () => {
    expect(
      pickAvailableBedForStayOffer({
        settings,
        offerId: 'female',
        availableBedIds: ['p1'],
      })
    ).toBeNull();
  });

  it('lists reception offer options with availability counts', () => {
    const options = listReceptionStayOfferOptions({
      settings,
      availableBedIds: ['f1', 'p1'],
    });
    expect(options).toEqual([
      { id: 'female', title: 'Female dorm', availableBedCount: 1 },
      { id: 'private', title: 'Private', availableBedCount: 1 },
    ]);
  });

  it('resolves offer from bed via room', () => {
    expect(resolveOfferIdForBed(settings, 'f2')).toBe('female');
    expect(resolveOfferIdForBed(settings, 'missing')).toBeNull();
  });
});
