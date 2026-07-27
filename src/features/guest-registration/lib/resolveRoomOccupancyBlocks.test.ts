import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';
import {
  listWholeRoomBlockedBedIdsForDateRange,
  listWholeRoomBlockedBedIdsForNight,
  roomHasWholeRoomOccupancyOnNight,
} from './resolveRoomOccupancyBlocks';

const settings: TenantSettings = {
  stayOffers: [
    { id: 'private', title: 'Private', bookingUnit: 'room' },
    { id: 'dorm', title: 'Dorm', bookingUnit: 'bed' },
  ],
  guestStay: {
    rooms: [
      { id: 'priv', label: 'P', floorId: '1', offerId: 'private' },
      { id: 'dorm1', label: 'D', floorId: '1', offerId: 'dorm' },
    ],
    beds: [
      { id: 'p1', roomId: 'priv' },
      { id: 'p2', roomId: 'priv' },
      { id: 'd1', roomId: 'dorm1' },
      { id: 'd2', roomId: 'dorm1' },
    ],
  },
};

function stay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return makeGuestStayRecordFixture({
    activated_at: '2026-07-27T12:00:00.000Z',
    magicLinkUrl: null,
    check_in_at: '2026-07-27T14:00:00.000Z',
    check_out_at: '2026-07-29T10:00:00.000Z',
    ...overrides,
  });
}

describe('resolveRoomOccupancyBlocks', () => {
  it('blocks free sibling beds when a whole-room offer room is occupied', () => {
    const stays = [stay({ bed_id: 'p1' })];
    expect(
      roomHasWholeRoomOccupancyOnNight({
        settings,
        stays,
        roomId: 'priv',
        nightDate: '2026-07-27',
      })
    ).toBe(true);
    expect(
      [...listWholeRoomBlockedBedIdsForNight({ settings, stays, nightDate: '2026-07-27' })].sort()
    ).toEqual(['p2']);
  });

  it('does not block empty whole-room rooms', () => {
    expect(
      roomHasWholeRoomOccupancyOnNight({
        settings,
        stays: [],
        roomId: 'priv',
        nightDate: '2026-07-27',
      })
    ).toBe(false);
    expect(listWholeRoomBlockedBedIdsForNight({ settings, stays: [], nightDate: '2026-07-27' }).size).toBe(
      0
    );
  });

  it('does not block dorm siblings when bed-unit offer has occupancy', () => {
    const stays = [stay({ bed_id: 'd1' })];
    expect(
      roomHasWholeRoomOccupancyOnNight({
        settings,
        stays,
        roomId: 'dorm1',
        nightDate: '2026-07-27',
      })
    ).toBe(false);
    expect(listWholeRoomBlockedBedIdsForNight({ settings, stays, nightDate: '2026-07-27' }).size).toBe(
      0
    );
  });

  it('does not block outside the occupied nights', () => {
    const stays = [stay({ bed_id: 'p1' })];
    expect(
      listWholeRoomBlockedBedIdsForNight({ settings, stays, nightDate: '2026-07-29' }).size
    ).toBe(0);
  });

  it('unions blocked beds across a create-booking date range', () => {
    const stays = [stay({ bed_id: 'p1' })];
    expect(
      [
        ...listWholeRoomBlockedBedIdsForDateRange({
          settings,
          stays,
          checkInDate: '2026-07-26',
          checkOutDate: '2026-07-28',
        }),
      ].sort()
    ).toEqual(['p2']);
  });
});
