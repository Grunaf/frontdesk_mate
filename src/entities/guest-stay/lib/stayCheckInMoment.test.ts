import { describe, expect, it } from 'vitest';
import {
  formatPropertyLocalCheckInIso,
  isStayCheckInStarted,
  normalizePropertyTimeZone,
  propertyLocalDateTimeToUtcMs,
  resolveStayCheckInInstantMs,
} from './stayCheckInMoment';

describe('propertyLocalDateTimeToUtcMs', () => {
  it('maps property-local check-in to UTC (Belgrade summer)', () => {
    const utcMs = propertyLocalDateTimeToUtcMs('2026-07-12', '14:00', 'Europe/Belgrade');
    expect(utcMs).not.toBeNull();
    expect(new Date(utcMs!).toISOString()).toBe('2026-07-12T12:00:00.000Z');
  });

  it('falls back to UTC when timezone is invalid', () => {
    const utcMs = propertyLocalDateTimeToUtcMs('2026-07-12', '14:00', 'Not/AZone');
    expect(utcMs).toBeNull();
  });
});

describe('isStayCheckInStarted', () => {
  const checkInAt = '2026-07-12T14:00:00.000Z';

  it('is false at 02:00 on check-in day in property timezone', () => {
    const belgradeTwoAm = new Date('2026-07-12T00:00:00.000Z');
    expect(
      isStayCheckInStarted({
        checkInAt,
        propertyTimeZone: 'Europe/Belgrade',
        checkInTimeFallback: '14:00',
        now: belgradeTwoAm,
      })
    ).toBe(false);
  });

  it('is true at 14:00 property local on check-in day', () => {
    const belgradeTwoPm = new Date('2026-07-12T12:00:00.000Z');
    expect(
      isStayCheckInStarted({
        checkInAt,
        propertyTimeZone: 'Europe/Belgrade',
        checkInTimeFallback: '14:00',
        now: belgradeTwoPm,
      })
    ).toBe(true);
  });

  it('uses guest browser instant against property-local check-in moment', () => {
    const guestInNewYorkBeforeHostelCheckIn = new Date('2026-07-12T11:00:00.000Z');
    expect(
      isStayCheckInStarted({
        checkInAt,
        propertyTimeZone: 'Europe/Belgrade',
        checkInTimeFallback: '14:00',
        now: guestInNewYorkBeforeHostelCheckIn,
      })
    ).toBe(false);
  });

  it('ignores legacy ISO time suffix and uses tenant checkInTime', () => {
    const checkInAtLegacy = '2026-07-12T22:22:00.000Z';

    expect(
      isStayCheckInStarted({
        checkInAt: checkInAtLegacy,
        propertyTimeZone: 'Europe/Belgrade',
        checkInTimeFallback: '14:00',
        now: new Date('2026-07-12T11:59:00.000Z'),
      })
    ).toBe(false);

    expect(
      isStayCheckInStarted({
        checkInAt: checkInAtLegacy,
        propertyTimeZone: 'Europe/Belgrade',
        checkInTimeFallback: '14:00',
        now: new Date('2026-07-12T12:00:00.000Z'),
      })
    ).toBe(true);
  });
});

describe('formatPropertyLocalCheckInIso', () => {
  it('stores UTC instant for reception access', () => {
    expect(formatPropertyLocalCheckInIso('2026-07-12', '14:00', 'Europe/Belgrade')).toBe(
      '2026-07-12T12:00:00.000Z'
    );
  });
});

describe('resolveStayCheckInInstantMs', () => {
  it('uses calendar day prefix + policy time, not ISO suffix', () => {
    expect(
      resolveStayCheckInInstantMs({
        checkInAt: '2026-07-12T22:22:00.000Z',
        propertyTimeZone: 'UTC',
        checkInTimeFallback: '14:00',
      })
    ).toBe(Date.parse('2026-07-12T14:00:00.000Z'));
  });
});

describe('normalizePropertyTimeZone', () => {
  it('defaults invalid values to UTC', () => {
    expect(normalizePropertyTimeZone('')).toBe('UTC');
    expect(normalizePropertyTimeZone('bad/zone')).toBe('UTC');
    expect(normalizePropertyTimeZone('Europe/Belgrade')).toBe('Europe/Belgrade');
  });
});
