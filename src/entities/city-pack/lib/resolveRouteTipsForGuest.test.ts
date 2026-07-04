import { describe, expect, it } from 'vitest';
import { resolveRouteTipsForGuest } from './resolveRouteTipsForGuest';

describe('resolveRouteTipsForGuest', () => {
  it('returns undefined when tips missing or all empty for locale', () => {
    expect(resolveRouteTipsForGuest(undefined, 'en')).toBeUndefined();
    expect(resolveRouteTipsForGuest([], 'en')).toBeUndefined();
    expect(resolveRouteTipsForGuest([{ en: '' }], 'en')).toBeUndefined();
  });

  it('keeps tips with copy for locale and drops empty entries', () => {
    const tips = resolveRouteTipsForGuest(
      [{ en: 'Pay in cash', ru: 'Наличные' }, { en: '' }, { en: 'Night taxi' }],
      'en'
    );

    expect(tips).toEqual(['Pay in cash', 'Night taxi']);
  });

  it('falls back to EN for RU when RU empty', () => {
    expect(resolveRouteTipsForGuest([{ en: 'EN only' }], 'ru')).toEqual(['EN only']);
  });
});
