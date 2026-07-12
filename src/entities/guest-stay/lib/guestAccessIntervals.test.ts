import { describe, expect, it } from 'vitest';
import {
  guestAccessBedNightsOverlap,
  guestAccessCoversNight,
  isGuestAccessInWindow,
  resolveGuestAccessStatus,
  resolveNightCellStatus,
  stayOverlapsBedNightRange,
} from './guestAccessIntervals';

describe('guestAccessBedNightsOverlap', () => {
  it('detects overlapping date ranges', () => {
    expect(
      guestAccessBedNightsOverlap(
        '2026-06-20T14:00:00.000Z',
        '2026-06-25T23:59:59.999Z',
        '2026-06-22T14:00:00.000Z',
        '2026-06-28T23:59:59.999Z'
      )
    ).toBe(true);
  });

  it('allows adjacent stays on turnover day', () => {
    expect(
      guestAccessBedNightsOverlap(
        '2026-06-20T14:00:00.000Z',
        '2026-06-22T23:59:59.999Z',
        '2026-06-22T14:00:00.000Z',
        '2026-06-25T23:59:59.999Z'
      )
    ).toBe(false);
  });

  it('treats identical date ranges as overlapping', () => {
    expect(
      guestAccessBedNightsOverlap(
        '2026-06-20T14:00:00.000Z',
        '2026-06-22T23:59:59.999Z',
        '2026-06-20T10:00:00.000Z',
        '2026-06-22T11:00:00.000Z'
      )
    ).toBe(true);
  });
});

describe('isGuestAccessInWindow', () => {
  it('is true during the access window', () => {
    expect(
      isGuestAccessInWindow(
        {
          check_in_at: '2026-06-20T14:00:00.000Z',
          check_out_at: '2026-06-25T23:59:59.999Z',
          revoked_at: null,
        },
        new Date('2026-06-22T12:00:00.000Z')
      )
    ).toBe(true);
  });

  it('is false before valid from', () => {
    expect(
      isGuestAccessInWindow(
        {
          check_in_at: '2026-06-25T14:00:00.000Z',
          check_out_at: '2026-06-28T23:59:59.999Z',
          revoked_at: null,
        },
        new Date('2026-06-22T12:00:00.000Z')
      )
    ).toBe(false);
  });

  it('ignores legacy ISO time suffix and uses policy check-in time', () => {
    expect(
      isGuestAccessInWindow(
        {
          check_in_at: '2026-07-12T22:22:00.000Z',
          check_out_at: '2026-07-14T23:59:59.999Z',
          revoked_at: null,
        },
        new Date('2026-07-12T12:00:00.000Z'),
        { checkInTime: '14:00', propertyTimeZone: 'Europe/Belgrade' }
      )
    ).toBe(true);

    expect(
      isGuestAccessInWindow(
        {
          check_in_at: '2026-07-12T22:22:00.000Z',
          check_out_at: '2026-07-14T23:59:59.999Z',
          revoked_at: null,
        },
        new Date('2026-07-12T11:59:00.000Z'),
        { checkInTime: '14:00', propertyTimeZone: 'Europe/Belgrade' }
      )
    ).toBe(false);
  });
});

describe('resolveGuestAccessStatus', () => {
  const now = new Date('2026-06-22T12:00:00.000Z');

  it('returns scheduled before valid from', () => {
    expect(
      resolveGuestAccessStatus(
        {
          check_in_at: '2026-06-25T14:00:00.000Z',
          check_out_at: '2026-06-28T23:59:59.999Z',
          activated_at: null,
          revoked_at: null,
        },
        now
      )
    ).toBe('scheduled');
  });

  it('returns in_app when activated inside window', () => {
    expect(
      resolveGuestAccessStatus(
        {
          check_in_at: '2026-06-20T14:00:00.000Z',
          check_out_at: '2026-06-25T23:59:59.999Z',
          activated_at: '2026-06-21T09:00:00.000Z',
          revoked_at: null,
        },
        now
      )
    ).toBe('in_app');
  });
});

describe('guestAccessCoversNight', () => {
  const stay = {
    check_in_at: '2026-06-22T14:00:00.000Z',
    check_out_at: '2026-06-25T23:59:59.999Z',
    revoked_at: null,
  };

  it('covers nights inside the bed-night range', () => {
    expect(guestAccessCoversNight(stay, '2026-06-22')).toBe(true);
    expect(guestAccessCoversNight(stay, '2026-06-24')).toBe(true);
    expect(guestAccessCoversNight(stay, '2026-06-25')).toBe(false);
  });
});

describe('resolveNightCellStatus', () => {
  it('returns scheduled before valid from', () => {
    expect(
      resolveNightCellStatus(
        {
          check_in_at: '2026-06-28T14:00:00.000Z',
          check_out_at: '2026-06-30T23:59:59.999Z',
          revoked_at: null,
        },
        '2026-06-28',
        new Date('2026-06-22T12:00:00.000Z')
      )
    ).toBe('scheduled');
  });
});

describe('stayOverlapsBedNightRange', () => {
  it('ignores revoked stays', () => {
    expect(
      stayOverlapsBedNightRange(
        {
          bed_id: 'bed-1',
          check_in_at: '2026-06-20T14:00:00.000Z',
          check_out_at: '2026-06-25T23:59:59.999Z',
          revoked_at: '2026-06-21T00:00:00.000Z',
        },
        'bed-1',
        '2026-06-22T14:00:00.000Z',
        '2026-06-28T23:59:59.999Z'
      )
    ).toBe(false);
  });
});
