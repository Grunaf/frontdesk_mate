import { describe, expect, it } from 'vitest';
import { resolveChipHorizontalScrollLeft } from './scrollChipHorizontallyIntoView';

describe('resolveChipHorizontalScrollLeft', () => {
  it('centers the chip within the horizontal container', () => {
    expect(
      resolveChipHorizontalScrollLeft({
        containerScrollLeft: 0,
        containerClientWidth: 200,
        containerScrollWidth: 600,
        containerLeft: 0,
        tabLeft: 300,
        tabWidth: 100,
      })
    ).toBe(250);
  });

  it('returns null when the chip is already centered', () => {
    expect(
      resolveChipHorizontalScrollLeft({
        containerScrollLeft: 100,
        containerClientWidth: 200,
        containerScrollWidth: 600,
        containerLeft: 0,
        tabLeft: 50,
        tabWidth: 100,
      })
    ).toBeNull();
  });

  it('clamps to the scrollable range', () => {
    expect(
      resolveChipHorizontalScrollLeft({
        containerScrollLeft: 0,
        containerClientWidth: 200,
        containerScrollWidth: 250,
        containerLeft: 0,
        tabLeft: 200,
        tabWidth: 50,
      })
    ).toBe(50);
  });
});
