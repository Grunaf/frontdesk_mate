import { describe, expect, it } from 'vitest';
import {
  collectCheckoutBedIdsToMark,
  isCheckoutNightStay,
  shouldMarkBedNeedsStrip,
  type CheckoutHousekeepingStay,
} from './resolveCheckoutBedsForHousekeeping';

function stay(partial: Partial<CheckoutHousekeepingStay> & Pick<CheckoutHousekeepingStay, 'bed_id'>): CheckoutHousekeepingStay {
  return {
    check_out_at: '2026-07-24T23:59:59.999Z',
    check_out_date: '2026-07-24',
    passport_checked_at: '2026-07-22T10:00:00.000Z',
    ...partial,
  };
}

describe('isCheckoutNightStay', () => {
  it('matches admitted stay whose last night is targetNight', () => {
    expect(isCheckoutNightStay(stay({ bed_id: 'b1' }), '2026-07-23')).toBe(true);
  });

  it('rejects continuing stay (not last night)', () => {
    expect(
      isCheckoutNightStay(
        stay({
          bed_id: 'b1',
          check_out_date: '2026-07-26',
          check_out_at: '2026-07-26T23:59:59.999Z',
        }),
        '2026-07-23'
      )
    ).toBe(false);
  });

  it('rejects not admitted', () => {
    expect(
      isCheckoutNightStay(
        stay({ bed_id: 'b1', passport_checked_at: null, desk_checked_in_at: null }),
        '2026-07-23'
      )
    ).toBe(false);
  });

  it('rejects revoked or archived', () => {
    expect(
      isCheckoutNightStay(stay({ bed_id: 'b1', revoked_at: '2026-07-23T12:00:00.000Z' }), '2026-07-23')
    ).toBe(false);
    expect(isCheckoutNightStay(stay({ bed_id: 'b1', is_archived: true }), '2026-07-23')).toBe(
      false
    );
  });

  it('accepts legacy desk_checked_in_at as admit', () => {
    expect(
      isCheckoutNightStay(
        stay({
          bed_id: 'b1',
          passport_checked_at: null,
          desk_checked_in_at: '2026-07-22T10:00:00.000Z',
        }),
        '2026-07-23'
      )
    ).toBe(true);
  });
});

describe('shouldMarkBedNeedsStrip', () => {
  it('marks unset and ready only', () => {
    expect(shouldMarkBedNeedsStrip(undefined)).toBe(true);
    expect(shouldMarkBedNeedsStrip('ready')).toBe(true);
    expect(shouldMarkBedNeedsStrip('needs_strip')).toBe(false);
    expect(shouldMarkBedNeedsStrip('stripped')).toBe(false);
  });
});

describe('collectCheckoutBedIdsToMark', () => {
  it('dedupes beds and skips in-progress statuses', () => {
    const stays = [
      stay({ bed_id: 'b1' }),
      stay({ bed_id: 'b1' }),
      stay({ bed_id: 'b2' }),
      stay({ bed_id: 'b3' }),
      stay({
        bed_id: 'b4',
        check_out_date: '2026-07-26',
        check_out_at: '2026-07-26T23:59:59.999Z',
      }),
    ];

    expect(
      collectCheckoutBedIdsToMark(stays, '2026-07-23', {
        b2: 'stripped',
        b3: 'needs_strip',
      })
    ).toEqual(['b1']);
  });
});
