import { describe, expect, it } from 'vitest';
import {
  endOfIsoWeekCalendarDay,
  expandRepeatWorkDates,
  formatHoursLabel,
  ISO_WEEKDAYS_MON_FRI,
  isoWeekdayOfCalendarDay,
  listIsoWeekCalendarDays,
  shiftDurationHours,
  shiftPropertyCalendarDay,
  shiftPropertyClockHhMm,
  startOfIsoWeekCalendarDay,
  sumShiftHours,
} from './volunteerShiftHours';

describe('volunteerShiftHours', () => {
  it('resolves ISO week Monday–Sunday', () => {
    // 2026-07-25 is Saturday
    expect(startOfIsoWeekCalendarDay('2026-07-25')).toBe('2026-07-20');
    expect(endOfIsoWeekCalendarDay('2026-07-20')).toBe('2026-07-26');
  });

  it('lists week calendar days', () => {
    expect(listIsoWeekCalendarDays('2026-07-20')).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ]);
  });

  it('maps ISO weekday', () => {
    expect(isoWeekdayOfCalendarDay('2026-07-20')).toBe(1);
    expect(isoWeekdayOfCalendarDay('2026-07-26')).toBe(7);
  });

  it('expands Mon–Fri repeat dates inclusively', () => {
    expect(
      expandRepeatWorkDates({
        from: '2026-07-20',
        until: '2026-07-26',
        weekdays: ISO_WEEKDAYS_MON_FRI,
      })
    ).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
    ]);
  });

  it('reads property-local day and clock', () => {
    // 07:00 Belgrade = 05:00 UTC in July
    expect(
      shiftPropertyCalendarDay('2026-07-20T05:00:00.000Z', 'Europe/Belgrade')
    ).toBe('2026-07-20');
    expect(shiftPropertyClockHhMm('2026-07-20T05:00:00.000Z', 'Europe/Belgrade')).toBe(
      '07:00'
    );
  });

  it('computes shift hours', () => {
    expect(
      shiftDurationHours('2026-07-20T08:00:00.000Z', '2026-07-20T12:30:00.000Z')
    ).toBe(4.5);
  });

  it('sums week hours', () => {
    expect(
      sumShiftHours([
        { starts_at: '2026-07-20T08:00:00.000Z', ends_at: '2026-07-20T12:00:00.000Z' },
        { starts_at: '2026-07-21T09:00:00.000Z', ends_at: '2026-07-21T14:00:00.000Z' },
      ])
    ).toBe(9);
  });

  it('formats hours label', () => {
    expect(formatHoursLabel(25)).toBe('25');
    expect(formatHoursLabel(12.5)).toBe('12.5');
  });
});
