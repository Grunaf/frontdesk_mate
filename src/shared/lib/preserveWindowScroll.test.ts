import { describe, expect, it } from 'vitest';
import { shouldRestoreWindowScroll } from './preserveWindowScroll';

describe('shouldRestoreWindowScroll', () => {
  it('returns false when scroll is within 1px tolerance', () => {
    expect(
      shouldRestoreWindowScroll({ x: 0, y: 400 }, { x: 0, y: 400 })
    ).toBe(false);
    expect(
      shouldRestoreWindowScroll({ x: 0, y: 400 }, { x: 0, y: 401 })
    ).toBe(false);
  });

  it('returns true when vertical scroll jumped beyond tolerance', () => {
    expect(
      shouldRestoreWindowScroll({ x: 0, y: 400 }, { x: 0, y: 0 })
    ).toBe(true);
    expect(
      shouldRestoreWindowScroll({ x: 0, y: 400 }, { x: 0, y: 402 })
    ).toBe(true);
  });
});
