import { describe, expect, it } from 'vitest';
import {
  formatBookingComInboxContactLine,
  parseBookingComAmountCurrency,
  parseBookingComExtranetDate,
  parseBookingComGuestCounts,
} from './parseBookingComExtranetFields';

describe('parseBookingComExtranetDate', () => {
  it('parses weekday + month day year', () => {
    expect(parseBookingComExtranetDate('Sat, Aug 1, 2026')).toBe('2026-08-01');
  });

  it('parses month day year', () => {
    expect(parseBookingComExtranetDate('Aug 1, 2026')).toBe('2026-08-01');
  });

  it('parses iso', () => {
    expect(parseBookingComExtranetDate('2026-08-01')).toBe('2026-08-01');
  });
});

describe('parseBookingComGuestCounts', () => {
  it('parses adults and children', () => {
    expect(parseBookingComGuestCounts('2 adults, 1 child')).toEqual({ adults: 2, children: 1 });
  });

  it('parses guests only', () => {
    expect(parseBookingComGuestCounts('3 guests')).toEqual({ adults: 3, children: null });
  });
});

describe('parseBookingComAmountCurrency', () => {
  it('parses euro amount', () => {
    expect(parseBookingComAmountCurrency('€ 120.50 EUR')).toEqual({
      amount: 120.5,
      currency: 'EUR',
    });
  });
});

describe('formatBookingComInboxContactLine', () => {
  it('prefers phone over email', () => {
    expect(
      formatBookingComInboxContactLine({
        phone_number: '+34600111222',
        guest_email: 'a@b.com',
      })
    ).toBe('+34600111222');
  });

  it('falls back to email', () => {
    expect(
      formatBookingComInboxContactLine({
        phone_number: null,
        guest_email: 'guest@example.com',
      })
    ).toBe('guest@example.com');
  });

  it('shows no contact when empty', () => {
    expect(formatBookingComInboxContactLine({ phone_number: null, guest_email: null })).toBe(
      'No contact yet'
    );
  });
});
