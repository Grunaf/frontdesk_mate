import { describe, expect, it } from 'vitest';
import {
  resolveDepartureSectionPhase,
  resolveDeparturesSectionPhase,
} from './resolveDepartureSectionPhase';

describe('resolveDepartureSectionPhase', () => {
  const checkOutDate = '2026-07-11';

  it('stays ahead when checkOutTime is missing (no fallback)', () => {
    const now = new Date('2026-07-11T12:00:00.000Z');
    expect(
      resolveDepartureSectionPhase({ now, checkOutDate, checkOutTime: null })
    ).toBe('ahead');
    expect(resolveDepartureSectionPhase({ now, checkOutDate, checkOutTime: '' })).toBe('ahead');
    expect(
      resolveDepartureSectionPhase({ now, checkOutDate, checkOutTime: 'invalid' })
    ).toBe('ahead');
  });

  it('classifies ahead / due_soon / overdue around check-out', () => {
    expect(
      resolveDepartureSectionPhase({
        now: new Date('2026-07-11T08:59:00.000Z'),
        checkOutDate,
        checkOutTime: '11:00',
      })
    ).toBe('ahead');

    expect(
      resolveDepartureSectionPhase({
        now: new Date('2026-07-11T09:00:00.000Z'),
        checkOutDate,
        checkOutTime: '11:00',
      })
    ).toBe('due_soon');

    expect(
      resolveDepartureSectionPhase({
        now: new Date('2026-07-11T11:00:00.000Z'),
        checkOutDate,
        checkOutTime: '11:00',
      })
    ).toBe('overdue');
  });
});

describe('resolveDeparturesSectionPhase', () => {
  it('picks the most urgent phase', () => {
    expect(resolveDeparturesSectionPhase(['ahead', 'due_soon'])).toBe('due_soon');
    expect(resolveDeparturesSectionPhase(['due_soon', 'overdue', 'ahead'])).toBe('overdue');
    expect(resolveDeparturesSectionPhase([])).toBe('ahead');
  });
});
