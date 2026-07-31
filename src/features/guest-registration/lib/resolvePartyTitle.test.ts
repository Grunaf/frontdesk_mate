import { describe, expect, it } from 'vitest';
import {
  isPlaceholderGuestName,
  resolvePartyLeadName,
  resolvePartyMemberOrdinal,
  resolvePartyMemberTitle,
  resolvePartyTitle,
} from './resolvePartyTitle';

describe('resolvePartyTitle', () => {
  it('uses lead name and bed count', () => {
    expect(resolvePartyTitle('Maria', 3)).toBe('Maria · 3 beds');
  });

  it('falls back without lead name', () => {
    expect(resolvePartyTitle('  ', 2)).toBe('Guest · 2 beds');
  });

  it('singular bed label', () => {
    expect(resolvePartyTitle('Alex', 1)).toBe('Alex · 1 bed');
  });
});

describe('isPlaceholderGuestName', () => {
  it('treats empty and Guest / Guest N as placeholders', () => {
    expect(isPlaceholderGuestName(null)).toBe(true);
    expect(isPlaceholderGuestName('')).toBe(true);
    expect(isPlaceholderGuestName('Guest')).toBe(true);
    expect(isPlaceholderGuestName('guest 3')).toBe(true);
    expect(isPlaceholderGuestName('Alex')).toBe(false);
    expect(isPlaceholderGuestName('Guest House')).toBe(false);
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

  it('skips Guest placeholders when resolving lead', () => {
    expect(
      resolvePartyLeadName([
        { guest_name: 'Guest', created_at: '2026-01-01T00:00:00Z', booking_amount_due_minor: 100 },
        { guest_name: 'Maria', created_at: '2026-01-02T00:00:00Z' },
      ])
    ).toBe('Maria');
  });
});

describe('resolvePartyMemberTitle', () => {
  it('uses own guest name when present', () => {
    expect(
      resolvePartyMemberTitle({ guestName: 'Alex', leadName: 'Maria', ordinal: 2 })
    ).toBe('Alex');
  });

  it('falls back to lead (ordinal) when name missing', () => {
    expect(
      resolvePartyMemberTitle({ guestName: null, leadName: 'Maria', ordinal: 2 })
    ).toBe('Maria (2)');
    expect(resolvePartyMemberTitle({ guestName: '  ', leadName: '', ordinal: 1 })).toBe(
      'Guest (1)'
    );
  });

  it('treats legacy Guest N as missing name', () => {
    expect(
      resolvePartyMemberTitle({ guestName: 'Guest 2', leadName: 'Maria', ordinal: 2 })
    ).toBe('Maria (2)');
  });
});

describe('resolvePartyMemberOrdinal', () => {
  it('orders by created_at ascending', () => {
    const party = [
      { id: 'b', created_at: '2026-01-02T00:00:00Z' },
      { id: 'a', created_at: '2026-01-01T00:00:00Z' },
    ];
    expect(resolvePartyMemberOrdinal(party, 'a')).toBe(1);
    expect(resolvePartyMemberOrdinal(party, 'b')).toBe(2);
  });
});
