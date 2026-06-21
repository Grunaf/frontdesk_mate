import { describe, expect, it } from 'vitest';
import {
  buildBookingRoomUrl,
  buildBookingSearchUrl,
  readBookingSettings,
  resolveBookingConfig,
} from './resolveBookingConfig';

describe('resolveBookingConfig', () => {
  it('returns none when no booking settings', () => {
    const config = resolveBookingConfig({});
    expect(config.provider).toBe('none');
    expect(config.enabled).toBe(false);
    expect(config.propertyUrl).toBeNull();
  });

  it('builds cloudbeds URL from booking block', () => {
    const config = resolveBookingConfig({
      booking: { provider: 'cloudbeds', engineId: 'SFTNHx' },
    });
    expect(config.provider).toBe('cloudbeds');
    expect(config.enabled).toBe(true);
    expect(config.propertyUrl).toBe('https://hotels.cloudbeds.com/en/reservation/SFTNHx');
  });

  it('builds frontdesk master URL from engine slug', () => {
    const config = resolveBookingConfig({
      booking: { provider: 'frontdesk_master', engineId: 'kotor-demo' },
    });
    expect(config.provider).toBe('frontdesk_master');
    expect(config.propertyUrl).toBe('https://book.frontdeskmate.com/kotor-demo');
    expect(config.paramKeys.roomType).toBe('room');
  });

  it('uses custom URL override', () => {
    const config = resolveBookingConfig({
      booking: {
        provider: 'cloudbeds',
        engineId: 'ignored',
        url: 'https://example.com/book',
      },
    });
    expect(config.propertyUrl).toBe('https://example.com/book');
  });

  it('builds provider-specific search URLs', () => {
    const cloudbeds = resolveBookingConfig({
      booking: { provider: 'cloudbeds', engineId: 'ABC' },
    });
    const url = buildBookingSearchUrl(cloudbeds, {
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
      guests: '2',
    });
    expect(url).toContain('checkIn=2026-06-01');
    expect(url).toContain('guests=2');

    const fdm = resolveBookingConfig({
      booking: { provider: 'frontdesk_master', engineId: 'demo' },
    });
    const roomUrl = buildBookingRoomUrl(fdm, 'DBL', {
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    });
    expect(roomUrl).toContain('checkin=2026-06-01');
    expect(roomUrl).toContain('room=DBL');
  });
});

describe('readBookingSettings', () => {
  it('reads explicit booking block', () => {
    expect(
      readBookingSettings({
        booking: { provider: 'none' },
      }).provider
    ).toBe('none');
  });
});
