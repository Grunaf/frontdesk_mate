import { describe, expect, it } from 'vitest';
import {
  countDormFreeBeds,
  findPrivateRoomOfferForParty,
  maxEmptyRoomUnitCapacity,
  pickBedsSameRoomFirst,
  resolveGlobalPartyCapacity,
} from './resolveReceptionPartyPlacement';
import type { TenantSettings } from '@/entities/tenant';

const settings: TenantSettings = {
  stayOffers: [
    { id: 'female', title: 'Female', bookingUnit: 'bed' },
    { id: 'mixed', title: 'Mixed', bookingUnit: 'bed' },
    { id: 'private', title: 'Private', bookingUnit: 'room' },
  ],
  guestStay: {
    rooms: [
      { id: 'f-small', label: 'F1', floorId: '1', offerId: 'female' },
      { id: 'f-big', label: 'F2', floorId: '1', offerId: 'female' },
      { id: 'm1', label: 'M1', floorId: '1', offerId: 'mixed' },
      { id: 'p1', label: 'P1', floorId: '1', offerId: 'private' },
    ],
    beds: [
      { id: 'fs1', roomId: 'f-small' },
      { id: 'fb1', roomId: 'f-big' },
      { id: 'fb2', roomId: 'f-big' },
      { id: 'fb3', roomId: 'f-big' },
      { id: 'm1a', roomId: 'm1' },
      { id: 'm1b', roomId: 'm1' },
      { id: 'p1a', roomId: 'p1' },
      { id: 'p1b', roomId: 'p1' },
      { id: 'p1c', roomId: 'p1' },
    ],
  },
};

describe('resolveReceptionPartyPlacement', () => {
  it('picks the dorm room with the most free beds when it fits', () => {
    expect(
      pickBedsSameRoomFirst({
        settings,
        preferredOfferId: 'female',
        availableBedIds: ['fs1', 'fb1', 'fb2', 'fb3', 'm1a', 'm1b', 'p1a', 'p1b', 'p1c'],
        count: 3,
      })
    ).toEqual(['fb1', 'fb2', 'fb3']);
  });

  it('splits across rooms when no single room fits', () => {
    expect(
      pickBedsSameRoomFirst({
        settings,
        preferredOfferId: 'female',
        availableBedIds: ['fs1', 'fb1', 'm1a', 'm1b'],
        count: 3,
      })
    ).toEqual(['m1a', 'm1b', 'fs1']);
  });

  it('for room-unit only uses fully empty rooms', () => {
    expect(
      pickBedsSameRoomFirst({
        settings,
        preferredOfferId: 'private',
        availableBedIds: ['p1a', 'p1b'],
        count: 2,
        emptyRoomsOnly: true,
        offerIdOnly: true,
      })
    ).toEqual([]);

    expect(
      pickBedsSameRoomFirst({
        settings,
        preferredOfferId: 'private',
        availableBedIds: ['p1a', 'p1b', 'p1c'],
        count: 2,
        emptyRoomsOnly: true,
        offerIdOnly: true,
      })
    ).toEqual(['p1a', 'p1b']);
  });

  it('counts dorm free excluding private room beds', () => {
    expect(
      countDormFreeBeds({
        settings,
        availableBedIds: ['fs1', 'fb1', 'p1a', 'p1b', 'p1c'],
      })
    ).toBe(2);
  });

  it('uses global capacity independent of selected offer', () => {
    const available = ['fs1', 'p1a', 'p1b', 'p1c'];
    expect(
      resolveGlobalPartyCapacity({
        settings,
        availableBedIds: available,
      })
    ).toBe(3);

    expect(
      resolveGlobalPartyCapacity({
        settings,
        availableBedIds: available,
      })
    ).toBe(
      Math.max(
        countDormFreeBeds({ settings, availableBedIds: available }),
        maxEmptyRoomUnitCapacity({ settings, availableBedIds: available })
      )
    );
  });

  it('finds a private room offer that fits the party', () => {
    expect(
      findPrivateRoomOfferForParty({
        settings,
        availableBedIds: ['p1a', 'p1b', 'p1c'],
        guestCount: 3,
      })
    ).toBe('private');

    expect(
      findPrivateRoomOfferForParty({
        settings,
        availableBedIds: ['p1a'],
        guestCount: 3,
      })
    ).toBeNull();
  });

  it('reports max empty private capacity', () => {
    expect(
      maxEmptyRoomUnitCapacity({
        settings,
        availableBedIds: ['p1a', 'p1b', 'p1c', 'fs1'],
      })
    ).toBe(3);
  });
});
