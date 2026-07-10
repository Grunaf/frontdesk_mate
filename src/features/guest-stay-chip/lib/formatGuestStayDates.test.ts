import { describe, expect, it } from 'vitest';
import { formatGuestStayCheckoutShort, formatGuestStayDateRange } from './formatGuestStayDates';

describe('formatGuestStayDates', () => {
  it('formats a date range in en from calendar nights', () => {
    expect(
      formatGuestStayDateRange('2026-06-22T14:00:00.000Z', '2026-06-25T10:00:00.000Z', 'en')
    ).toBe('Jun 22 – Jun 25');
  });

  it('does not shift check-in day when instant is late UTC', () => {
    expect(formatGuestStayDateRange('2026-07-10T22:22:00.000Z', '2026-07-12T23:59:59.999Z', 'en')).toBe(
      'Jul 10 – Jul 12'
    );
  });

  it('formats checkout short label from calendar prefix', () => {
    expect(formatGuestStayCheckoutShort('2026-06-25T10:00:00.000Z', 'en')).toBe('Jun 25');
    expect(formatGuestStayCheckoutShort('2026-07-11T23:59:59.999Z', 'en')).toBe('Jul 11');
  });
});
