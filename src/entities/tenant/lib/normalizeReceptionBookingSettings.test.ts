import { describe, expect, it } from 'vitest';
import {
  formatReceptionBookingSourceSummary,
  normalizeReceptionBookingForSave,
  slugifyBookingPlatformId,
  validateReceptionBookingPlatformsForAdmin,
} from './normalizeReceptionBookingSettings';

describe('normalizeReceptionBookingSettings', () => {
  it('slugifies labels', () => {
    expect(slugifyBookingPlatformId('Booking.com')).toBe('booking-com');
  });

  it('dedupes platforms on save', () => {
    const result = normalizeReceptionBookingForSave({
      platforms: [
        { id: 'walk-in', label: 'Walk-in' },
        { id: 'walk-in', label: 'Walk-in duplicate' },
      ],
    });
    expect(result?.platforms).toHaveLength(1);
  });

  it('formats booking summary with unknown platform label', () => {
    expect(
      formatReceptionBookingSourceSummary(undefined, 'removed-id', 'ABC123')
    ).toBe('Unknown platform · #ABC123');
  });

  it('validates admin platforms', () => {
    expect(
      validateReceptionBookingPlatformsForAdmin({
        receptionBooking: {
          platforms: [{ id: 'bad id', label: 'X' }],
        },
      })
    ).toMatch(/slug/i);
  });
});
