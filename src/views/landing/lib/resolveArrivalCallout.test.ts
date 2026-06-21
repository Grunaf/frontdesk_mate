import { describe, expect, it } from 'vitest';
import { resolveArrivalCallout } from './resolveArrivalCallout';

describe('resolveArrivalCallout', () => {
  const now = new Date('2026-06-20T12:00:00');

  it('returns arrival for check-in within two days', () => {
    expect(resolveArrivalCallout('2026-06-20', now)).toBe('arrival');
    expect(resolveArrivalCallout('2026-06-22', now)).toBe('arrival');
  });

  it('returns explore for distant check-in', () => {
    expect(resolveArrivalCallout('2026-06-25', now)).toBe('explore');
  });

  it('returns null for past or empty dates', () => {
    expect(resolveArrivalCallout('2026-06-19', now)).toBeNull();
    expect(resolveArrivalCallout('', now)).toBeNull();
  });
});
