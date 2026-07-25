import { describe, expect, it } from 'vitest';
import {
  formatReceptionBookingSourceSummary,
  normalizeReceptionBookingForSave,
  resolveBookingComHotelId,
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

  it('keeps bookingComHotelId when platforms are empty', () => {
    const result = normalizeReceptionBookingForSave({
      platforms: [],
      bookingComHotelId: ' 12345 ',
    });
    expect(result).toEqual({ platforms: [], bookingComHotelId: '12345' });
  });

  it('drops empty receptionBooking', () => {
    expect(normalizeReceptionBookingForSave({ platforms: [], bookingComHotelId: '  ' })).toBeUndefined();
  });

  it('formats booking summary with unknown platform label', () => {
    expect(
      formatReceptionBookingSourceSummary(undefined, 'removed-id', 'ABC123')
    ).toBe('Unknown platform · #ABC123');
  });

  it('resolves booking.com hotel id', () => {
    expect(
      resolveBookingComHotelId({
        receptionBooking: { platforms: [], bookingComHotelId: '98765' },
      })
    ).toBe('98765');
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

  it('validates booking.com hotel id digits', () => {
    expect(
      validateReceptionBookingPlatformsForAdmin({
        receptionBooking: {
          platforms: [],
          bookingComHotelId: '12ab',
        },
      })
    ).toMatch(/digits/i);
  });
});
