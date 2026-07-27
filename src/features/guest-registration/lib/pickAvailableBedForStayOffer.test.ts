import { describe, expect, it } from 'vitest';
import {
  listBedIdsForStayOffer,
  listReceptionStayOfferOptions,
  pickAvailableBedForStayOffer,
  pickAvailableBedsForStayOffer,
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

  it('picks N free beds from offer pool', () => {
    expect(
      pickAvailableBedsForStayOffer({
        settings,
        offerId: 'female',
        availableBedIds: ['f1', 'f2', 'p1'],
        count: 2,
      })
    ).toEqual(['f1', 'f2']);
  });

  it('for room-unit offers prefers beds from one physical room', () => {
    const roomSettings: TenantSettings = {
      stayOffers: [{ id: 'private', title: 'Private', bookingUnit: 'room' }],
      guestStay: {
        rooms: [
          { id: 'p1', label: 'P1', floorId: '1', offerId: 'private' },
          { id: 'p2', label: 'P2', floorId: '1', offerId: 'private' },
        ],
        beds: [
          { id: 'a1', roomId: 'p1' },
          { id: 'a2', roomId: 'p1' },
          { id: 'b1', roomId: 'p2' },
          { id: 'b2', roomId: 'p2' },
        ],
      },
    };

    expect(
      pickAvailableBedsForStayOffer({
        settings: roomSettings,
        offerId: 'private',
        availableBedIds: ['a2', 'b1', 'b2'],
        count: 2,
      })
    ).toEqual(['b1', 'b2']);
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
