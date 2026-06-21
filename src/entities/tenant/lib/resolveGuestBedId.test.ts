import { describe, expect, it } from 'vitest';
import { readGuestBedIdFromSearchParams, resolveGuestBedId } from './resolveGuestBedId';

describe('resolveGuestBedId', () => {
  it('prefers runtime bed over admin preview bed', () => {
    expect(resolveGuestBedId({ highlightedBedId: '4B' }, '9Z')).toBe('9Z');
  });

  it('falls back to highlightedBedId when runtime is empty', () => {
    expect(resolveGuestBedId({ highlightedBedId: '4B' }, null)).toBe('4B');
  });

  it('reads bed and bedId search params', () => {
    expect(readGuestBedIdFromSearchParams(new URLSearchParams('bed=4B'))).toBe('4B');
    expect(readGuestBedIdFromSearchParams(new URLSearchParams('bedId=4A-Bot'))).toBe('4A-Bot');
  });
});
