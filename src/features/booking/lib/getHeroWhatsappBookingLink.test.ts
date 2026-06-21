import { describe, expect, it } from 'vitest';
import { getHeroWhatsappBookingLink } from './getHeroWhatsappBookingLink';

describe('getHeroWhatsappBookingLink', () => {
  it('builds whatsapp link with dates and guests', () => {
    const href = getHeroWhatsappBookingLink({
      phoneRaw: '38761123456',
      hostelName: 'Vega Hostel',
      checkin: '2026-07-01',
      checkout: '2026-07-05',
      guests: '2',
    });

    expect(href).toContain('wa.me');
    expect(href).toContain(encodeURIComponent('Vega Hostel'));
    expect(href).toContain(encodeURIComponent('2026-07-01'));
    expect(href).toContain(encodeURIComponent('Guests: 2'));
  });

  it('returns null without phone', () => {
    expect(
      getHeroWhatsappBookingLink({
        phoneRaw: '',
        hostelName: 'Vega Hostel',
      })
    ).toBeNull();
  });
});
