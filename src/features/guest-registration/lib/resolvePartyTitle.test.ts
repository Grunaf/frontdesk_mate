import { describe, expect, it } from 'vitest';
import { resolvePartyLeadName, resolvePartyTitle } from './resolvePartyTitle';

describe('resolvePartyTitle', () => {
  it('uses lead name with apostrophe-s', () => {
    expect(resolvePartyTitle('Maria', 3)).toBe("Maria's party");
  });

  it('falls back without lead name', () => {
    expect(resolvePartyTitle('  ', 2)).toBe('Party · 2 beds');
  });
});

describe('resolvePartyLeadName', () => {
  it('prefers balance-bearing row', () => {
    expect(
      resolvePartyLeadName([
        {
          guest_name: 'Maria 2',
          created_at: '2026-01-01T00:00:00Z',
          booking_amount_due_minor: null,
        },
        {
          guest_name: 'Maria',
          created_at: '2026-01-01T00:00:01Z',
          booking_amount_due_minor: 8000,
        },
      ])
    ).toBe('Maria');
  });

  it('uses earliest when no balance', () => {
    expect(
      resolvePartyLeadName([
        { guest_name: 'Alex 2', created_at: '2026-01-02T00:00:00Z' },
        { guest_name: 'Alex', created_at: '2026-01-01T00:00:00Z' },
      ])
    ).toBe('Alex');
  });
});
