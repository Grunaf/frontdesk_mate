import { describe, expect, it } from 'vitest';
import { Banknote, Pizza, ShoppingBag } from 'lucide-react';
import {
  resolvePlaceLucideIcon,
  resolvePlaceUtilityLabelKey,
} from './place-icon-registry';

describe('place-icon-registry', () => {
  it('resolves preset icons by iconId', () => {
    expect(resolvePlaceLucideIcon({ iconId: 'pizza' })).toBe(Pizza);
  });

  it('falls back to city category icons', () => {
    expect(resolvePlaceLucideIcon({ category: 'essential', scope: 'city' })).toBe(Banknote);
  });

  it('exposes utility label keys for compact essentials', () => {
    expect(resolvePlaceUtilityLabelKey('atm')).toBe('essentials.atm');
    expect(resolvePlaceUtilityLabelKey('grocery')).toBe('essentials.shop');
    expect(resolvePlaceUtilityLabelKey('restaurant')).toBeUndefined();
  });
});
