import { describe, expect, it } from 'vitest';
import { resolveBookingSourceOpenTarget } from './resolveBookingSourceOpenTarget';

describe('resolveBookingSourceOpenTarget', () => {
  it('builds booking.com target', () => {
    const target = resolveBookingSourceOpenTarget({
      platformId: 'booking-com',
      externalId: '9876543210',
      tenantSettings: {
        receptionBooking: { platforms: [], bookingComHotelId: '12345' },
      },
    });
    expect(target?.platformId).toBe('booking-com');
    expect(target?.openUrl).toContain('admin.booking.com');
    expect(target?.openUrl).toContain('res_id=9876543210');
  });

  it('builds hostelworld target with unique only in url', () => {
    const target = resolveBookingSourceOpenTarget({
      platformId: 'hostelworld',
      externalId: '78901',
      tenantSettings: {
        receptionBooking: { platforms: [], hostelworldBookingPrefix: '123456' },
      },
    });
    expect(target?.platformId).toBe('hostelworld');
    expect(target?.openUrl).toBe('https://inbox.hostelworld.com/booking/view/78901');
    expect(target?.referenceDisplay).toBe('123456-78901');
  });

  it('returns null for walk-in', () => {
    expect(
      resolveBookingSourceOpenTarget({
        platformId: 'walk-in',
        externalId: 'x',
      })
    ).toBeNull();
  });
});
