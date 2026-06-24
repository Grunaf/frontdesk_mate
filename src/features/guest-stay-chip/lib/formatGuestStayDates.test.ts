import { describe, expect, it } from 'vitest';
import { formatGuestStayCheckoutShort, formatGuestStayDateRange } from './formatGuestStayDates';

describe('formatGuestStayDates', () => {
  it('formats a date range in en', () => {
    expect(
      formatGuestStayDateRange('2026-06-22T14:00:00.000Z', '2026-06-25T10:00:00.000Z', 'en')
    ).toMatch(/22.*25/);
  });

  it('formats checkout short label', () => {
    expect(formatGuestStayCheckoutShort('2026-06-25T10:00:00.000Z', 'en')).toMatch(/25/);
  });
});
