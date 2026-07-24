import { describe, expect, it } from 'vitest';
import { resolveBedStayPresenceLinks } from './resolveBedStayPresenceLinks';

const base = {
  id: 's1',
  bed_id: 'b1',
  guest_name: 'Ada',
  check_in_at: '2026-07-22T14:00:00.000Z',
  check_out_at: '2026-07-24T23:59:59.999Z',
  check_in_date: '2026-07-22',
  check_out_date: '2026-07-24',
  passport_checked_at: '2026-07-22T15:00:00.000Z',
};

describe('resolveBedStayPresenceLinks', () => {
  it('maps admitted stay covering night to bed', () => {
    expect(resolveBedStayPresenceLinks([base], '2026-07-23')).toEqual({
      b1: { stayId: 's1', guestName: 'Ada' },
    });
  });

  it('skips not admitted and non-covering nights', () => {
    expect(
      resolveBedStayPresenceLinks(
        [{ ...base, passport_checked_at: null, desk_checked_in_at: null }],
        '2026-07-23'
      )
    ).toEqual({});
    expect(resolveBedStayPresenceLinks([base], '2026-07-24')).toEqual({});
  });
});
