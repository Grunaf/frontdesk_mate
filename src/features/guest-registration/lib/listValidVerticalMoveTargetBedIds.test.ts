import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import type { TenantSettings } from '@/entities/tenant';
import { listValidVerticalMoveTargetBedIds } from './listValidVerticalMoveTargetBedIds';

const settings: TenantSettings = {
  stayOffers: [
    { id: 'private', title: 'Private', bookingUnit: 'room' },
    { id: 'dorm', title: 'Dorm', bookingUnit: 'bed' },
  ],
  guestStay: {
    rooms: [
      { id: 'dorm1', label: 'D', floorId: '1', offerId: 'dorm' },
      { id: 'priv', label: 'P', floorId: '1', offerId: 'private' },
    ],
    beds: [
      { id: 'd1', roomId: 'dorm1' },
      { id: 'd2', roomId: 'dorm1' },
      { id: 'd3', roomId: 'dorm1' },
      { id: 'p1', roomId: 'priv' },
      { id: 'p2', roomId: 'priv' },
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

describe('listValidVerticalMoveTargetBedIds', () => {
  it('returns other free beds for the same nights', () => {
    const moving = stay({ id: 'move-me', bed_id: 'd1' });
    expect(
      listValidVerticalMoveTargetBedIds({
        settings,
        stays: [moving],
        stay: moving,
      }).sort()
    ).toEqual(['d2', 'd3', 'p1', 'p2']);
  });

  it('excludes beds with occupancy overlap on any night', () => {
    const moving = stay({ id: 'move-me', bed_id: 'd1' });
    const blocker = stay({
      id: 'blocker',
      bed_id: 'd2',
      check_in_at: '2026-07-28T14:00:00.000Z',
      check_out_at: '2026-07-30T10:00:00.000Z',
    });
    expect(
      listValidVerticalMoveTargetBedIds({
        settings,
        stays: [moving, blocker],
        stay: moving,
      }).sort()
    ).toEqual(['d3', 'p1', 'p2']);
  });

  it('excludes whole-room sibling holds', () => {
    const moving = stay({ id: 'move-me', bed_id: 'd1' });
    const privateOccupant = stay({ id: 'priv-guest', bed_id: 'p1' });
    expect(
      listValidVerticalMoveTargetBedIds({
        settings,
        stays: [moving, privateOccupant],
        stay: moving,
      }).sort()
    ).toEqual(['d2', 'd3']);
  });

  it('ignores the moving stay when judging its current bed siblings', () => {
    const moving = stay({ id: 'move-me', bed_id: 'p1' });
    expect(
      listValidVerticalMoveTargetBedIds({
        settings,
        stays: [moving],
        stay: moving,
      }).sort()
    ).toEqual(['d1', 'd2', 'd3', 'p2']);
  });
});
