import { describe, expect, it } from 'vitest';
import { isValidTimeValue, normalizeTimeValue } from './time';

describe('time', () => {
  it('accepts valid HH:MM values', () => {
    expect(isValidTimeValue('14:00')).toBe(true);
    expect(normalizeTimeValue('09:30')).toBe('09:30');
  });

  it('rejects invalid values', () => {
    expect(isValidTimeValue('25:00')).toBe(false);
    expect(normalizeTimeValue('noon')).toBeUndefined();
    expect(normalizeTimeValue('')).toBeUndefined();
  });
});
