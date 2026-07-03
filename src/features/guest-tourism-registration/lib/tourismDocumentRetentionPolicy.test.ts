import { describe, expect, it } from 'vitest';

import {
  addRetentionDaysToCheckOut,
  DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS,
  isTourismDocumentRetentionDue,
  resolveTourismDocumentRetentionCutoffIso,
} from './tourismDocumentRetentionPolicy';

describe('tourismDocumentRetentionPolicy', () => {
  it('adds retention days in UTC', () => {
    const checkOut = new Date('2026-01-01T12:00:00.000Z');
    const purgeAfter = addRetentionDaysToCheckOut(checkOut, 90);
    expect(purgeAfter.toISOString()).toBe('2026-04-01T12:00:00.000Z');
  });

  it('is not due before check_out + retention', () => {
    const checkOut = '2026-01-01T00:00:00.000Z';
    const now = new Date('2026-03-31T23:59:59.999Z');
    expect(isTourismDocumentRetentionDue(checkOut, now, 90)).toBe(false);
  });

  it('is due on check_out + 90 days (Chat A default)', () => {
    const checkOut = '2026-01-01T00:00:00.000Z';
    const now = new Date('2026-04-01T00:00:00.000Z');
    expect(
      isTourismDocumentRetentionDue(checkOut, now, DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS)
    ).toBe(true);
  });

  it('is not due when check_out is in the future', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    expect(isTourismDocumentRetentionDue('2026-12-01T00:00:00.000Z', now, 90)).toBe(false);
  });

  it('computes SQL cutoff as now minus retention days', () => {
    const now = new Date('2026-04-01T00:00:00.000Z');
    expect(resolveTourismDocumentRetentionCutoffIso(now, 90)).toBe('2026-01-01T00:00:00.000Z');
  });
});
