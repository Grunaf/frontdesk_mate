import { describe, expect, it } from 'vitest';
import { resolveGuestBedId } from './resolveGuestBedId';

describe('resolveGuestBedId', () => {
  it('returns runtime bed id when present', () => {
    expect(resolveGuestBedId({}, '9Z')).toBe('9Z');
  });

  it('returns null when runtime is empty', () => {
    expect(resolveGuestBedId({}, null)).toBe(null);
    expect(resolveGuestBedId({}, undefined)).toBe(null);
    expect(resolveGuestBedId({}, '  ')).toBe(null);
  });
});
