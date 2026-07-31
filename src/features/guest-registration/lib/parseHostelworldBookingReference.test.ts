import { describe, expect, it } from 'vitest';
import {
  buildHostelworldReservationUrl,
  formatHostelworldBookingReferenceDisplay,
  parseHostelworldBookingReference,
} from './parseHostelworldBookingReference';

describe('parseHostelworldBookingReference', () => {
  it('proposes prefix from full number when none known', () => {
    expect(parseHostelworldBookingReference('12345678901', null)).toEqual({
      ok: true,
      unique: '78901',
      proposedPrefix: '123456',
    });
  });

  it('proposes prefix from full number with display hyphen', () => {
    expect(parseHostelworldBookingReference('123456-78901', null)).toEqual({
      ok: true,
      unique: '78901',
      proposedPrefix: '123456',
    });
  });

  it('strips known prefix from pasted full number', () => {
    expect(parseHostelworldBookingReference('12345678901', '123456')).toEqual({
      ok: true,
      unique: '78901',
    });
  });

  it('strips known prefix and hyphen from pasted full number', () => {
    expect(parseHostelworldBookingReference('123456-78901', '123456')).toEqual({
      ok: true,
      unique: '78901',
    });
  });

  it('strips leading hyphen from unique-only paste', () => {
    expect(parseHostelworldBookingReference('-78901', '123456')).toEqual({
      ok: true,
      unique: '78901',
    });
  });

  it('keeps unique as-is when paste does not start with prefix', () => {
    expect(parseHostelworldBookingReference('99999', '123456')).toEqual({
      ok: true,
      unique: '99999',
    });
  });

  it('rejects too short first entry', () => {
    expect(parseHostelworldBookingReference('123456', null)).toEqual({
      ok: false,
      error: 'too_short',
    });
  });
});

describe('buildHostelworldReservationUrl', () => {
  it('uses unique part only', () => {
    expect(buildHostelworldReservationUrl('78901')).toBe(
      'https://inbox.hostelworld.com/booking/view/78901'
    );
  });

  it('strips hyphen from unique before building url', () => {
    expect(buildHostelworldReservationUrl('-78901')).toBe(
      'https://inbox.hostelworld.com/booking/view/78901'
    );
  });

  it('returns null for empty', () => {
    expect(buildHostelworldReservationUrl('  ')).toBeNull();
  });
});

describe('formatHostelworldBookingReferenceDisplay', () => {
  it('joins prefix and unique with display hyphen', () => {
    expect(formatHostelworldBookingReferenceDisplay('123456', '78901')).toBe('123456-78901');
  });

  it('returns unique only when prefix missing', () => {
    expect(formatHostelworldBookingReferenceDisplay(null, '78901')).toBe('78901');
  });
});
