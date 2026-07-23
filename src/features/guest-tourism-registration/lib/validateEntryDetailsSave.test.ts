import { describe, expect, it } from 'vitest';
import { validateEntryDetailsSave } from './validateEntryDetailsSave';

describe('validateEntryDetailsSave', () => {
  it('requires a known airport for plane', () => {
    const result = validateEntryDetailsSave({
      profileId: 'me',
      transportType: 'plane',
      entryPointCode: 'XXX',
      entryPointLabel: 'Unknown',
      assignments: [{ guestId: 'g1', entryStampDate: '2026-07-01' }],
    });
    expect(result).toEqual({ ok: false, error: 'invalid_entry_point' });
  });

  it('accepts Montenegro airport for plane', () => {
    const result = validateEntryDetailsSave({
      profileId: 'me',
      transportType: 'plane',
      entryPointCode: 'tiv',
      entryPointLabel: 'ignored',
      assignments: [{ guestId: 'g1', entryStampDate: '2026-07-01', entryStampPage: 12 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entryPointCode).toBe('TIV');
    expect(result.value.entryPointLabel).toContain('Tivat');
    expect(result.value.assignments[0]?.entryStampPage).toBe(12);
  });

  it('allows free-text entry point for non-plane', () => {
    const result = validateEntryDetailsSave({
      profileId: 'me',
      transportType: 'bus',
      entryPointCode: null,
      entryPointLabel: '  Debeli Brijeg  ',
      assignments: [{ guestId: 'g1', entryStampDate: '2026-07-01' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entryPointCode).toBeNull();
    expect(result.value.entryPointLabel).toBe('Debeli Brijeg');
  });

  it('rejects unknown profile catalog', () => {
    const result = validateEntryDetailsSave({
      profileId: 'unknown',
      transportType: 'car',
      entryPointCode: null,
      entryPointLabel: 'Somewhere',
      assignments: [{ guestId: 'g1', entryStampDate: '2026-07-01' }],
    });
    expect(result).toEqual({ ok: false, error: 'no_catalog' });
  });
});
