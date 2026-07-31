import { describe, expect, it } from 'vitest';
import { resolvePartyBookingBlockers } from './resolvePartyBookingBlockers';

describe('resolvePartyBookingBlockers', () => {
  const stays = [
    { id: 'a', passport_checked_at: null, desk_checked_in_at: null },
    { id: 'b', passport_checked_at: '2026-01-01', desk_checked_in_at: '2026-01-01' },
    { id: 'c', passport_checked_at: null, desk_checked_in_at: null },
  ];

  it('returns null when all ready', () => {
    expect(
      resolvePartyBookingBlockers({
        partyStays: [
          { id: 'a', passport_checked_at: 'x', desk_checked_in_at: 'x' },
          { id: 'b', passport_checked_at: 'x', desk_checked_in_at: 'x' },
        ],
        showTourismSummary: true,
        tourismByStayId: { a: 'complete', b: 'complete' },
      })
    ).toBeNull();
  });

  it('reports tourism and expected blockers', () => {
    expect(
      resolvePartyBookingBlockers({
        partyStays: stays,
        showTourismSummary: true,
        tourismByStayId: {
          a: 'not_started',
          b: 'complete',
          c: 'in_progress',
        },
      })
    ).toBe('2 beds need tourism · 2 expected');
  });

  it('skips tourism line when tourism off', () => {
    expect(
      resolvePartyBookingBlockers({
        partyStays: stays,
        showTourismSummary: false,
        tourismByStayId: {},
      })
    ).toBe('2 expected');
  });
});
