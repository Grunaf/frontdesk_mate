import { describe, expect, it } from 'vitest';
import {
  resolveReservationStayPeriod,
  stayRecordCheckInDate,
} from './resolveReservationStayPeriod';

describe('resolveReservationStayPeriod', () => {
  it('builds dates and property-local check-in instant', () => {
    expect(
      resolveReservationStayPeriod({
        checkInDate: '2026-07-12',
        checkOutDate: '2026-07-14',
        checkInTime: '14:00',
        propertyTimeZone: 'Europe/Belgrade',
      })
    ).toEqual({
      checkInDate: '2026-07-12',
      checkOutDate: '2026-07-14',
      checkInAt: '2026-07-12T12:00:00.000Z',
      checkOutAt: '2026-07-14T23:59:59.999Z',
    });
  });

  it('keeps form calendar day when property-local instant falls on previous UTC day', () => {
    expect(
      resolveReservationStayPeriod({
        checkInDate: '2026-07-21',
        checkOutDate: '2026-07-22',
        checkInTime: '01:00',
        propertyTimeZone: 'Europe/Belgrade',
      })
    ).toEqual({
      checkInDate: '2026-07-21',
      checkOutDate: '2026-07-22',
      checkInAt: '2026-07-20T23:00:00.000Z',
      checkOutAt: '2026-07-22T23:59:59.999Z',
    });
  });

  it('prefers form dates over recovering from pre-encoded ISO (no double-shift)', () => {
    expect(
      resolveReservationStayPeriod({
        checkInDate: '2026-07-21',
        checkOutDate: '2026-07-22',
        checkInAt: '2026-07-20T23:00:00.000Z',
        checkOutAt: '2026-07-22T23:59:59.999Z',
        checkInTime: '01:00',
        propertyTimeZone: 'Europe/Belgrade',
      })
    ).toEqual({
      checkInDate: '2026-07-21',
      checkOutDate: '2026-07-22',
      checkInAt: '2026-07-20T23:00:00.000Z',
      checkOutAt: '2026-07-22T23:59:59.999Z',
    });
  });

  it('recovers calendar days from legacy ISO', () => {
    expect(
      resolveReservationStayPeriod({
        checkInAt: '2026-07-12T22:22:00.000Z',
        checkOutAt: '2026-07-15T23:59:59.999Z',
        checkInTime: '14:00',
        propertyTimeZone: 'UTC',
      })
    ).toEqual({
      checkInDate: '2026-07-12',
      checkOutDate: '2026-07-15',
      checkInAt: '2026-07-12T14:00:00.000Z',
      checkOutAt: '2026-07-15T23:59:59.999Z',
    });
  });
});

describe('stayRecordCheckInDate', () => {
  it('prefers explicit check_in_date', () => {
    expect(
      stayRecordCheckInDate({
        check_in_date: '2026-07-12',
        check_in_at: '2026-07-11T22:00:00.000Z',
      })
    ).toBe('2026-07-12');
  });
});
