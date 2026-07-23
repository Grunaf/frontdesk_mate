import { describe, expect, it } from 'vitest';
import { isOutsideReceptionHours } from './isOutsideReceptionHours';

/** Fixed UTC instant; with Europe/Belgrade (UTC+1 winter) = local hour offset. */
function atUtc(iso: string): Date {
  return new Date(iso);
}

describe('isOutsideReceptionHours', () => {
  it('returns false when open or close is missing', () => {
    expect(isOutsideReceptionHours(undefined, '22:00', atUtc('2026-01-15T12:00:00Z'))).toBe(false);
    expect(isOutsideReceptionHours('08:00', undefined, atUtc('2026-01-15T12:00:00Z'))).toBe(false);
  });

  it('treats same open and close as always open (day)', () => {
    expect(isOutsideReceptionHours('08:00', '08:00', atUtc('2026-01-15T12:00:00Z'), 'UTC')).toBe(
      false
    );
  });

  it('same-day window: inside is day, outside is night', () => {
    expect(isOutsideReceptionHours('08:00', '22:00', atUtc('2026-01-15T10:00:00Z'), 'UTC')).toBe(
      false
    );
    expect(isOutsideReceptionHours('08:00', '22:00', atUtc('2026-01-15T07:59:00Z'), 'UTC')).toBe(
      true
    );
    expect(isOutsideReceptionHours('08:00', '22:00', atUtc('2026-01-15T22:00:00Z'), 'UTC')).toBe(
      true
    );
  });

  it('overnight window: closed only between close and open', () => {
    expect(isOutsideReceptionHours('22:00', '06:00', atUtc('2026-01-15T23:00:00Z'), 'UTC')).toBe(
      false
    );
    expect(isOutsideReceptionHours('22:00', '06:00', atUtc('2026-01-15T03:00:00Z'), 'UTC')).toBe(
      false
    );
    expect(isOutsideReceptionHours('22:00', '06:00', atUtc('2026-01-15T12:00:00Z'), 'UTC')).toBe(
      true
    );
  });
});
