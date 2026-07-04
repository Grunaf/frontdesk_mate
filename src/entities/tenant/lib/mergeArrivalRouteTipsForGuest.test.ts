import { describe, expect, it } from 'vitest';
import { mergeArrivalRouteTipsForGuest } from './mergeArrivalRouteTipsForGuest';

describe('mergeArrivalRouteTipsForGuest', () => {
  it('merges city and tenant tips without duplicates', () => {
    const merged = mergeArrivalRouteTipsForGuest({
      cityPackTips: ['Pay in cash', 'City tip'],
      tenantTips: [{ en: 'Use side entrance' }, { en: 'pay in cash' }],
      locale: 'en',
    });

    expect(merged).toEqual(['Pay in cash', 'City tip', 'Use side entrance']);
  });
});
