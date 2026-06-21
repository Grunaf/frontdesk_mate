import { describe, expect, it } from 'vitest';
import { Coffee, UtensilsCrossed, Wine } from 'lucide-react';
import {
  PLACE_CATEGORY_IDS,
  resolvePlaceCategoryAdminLabel,
  resolvePlaceCategoryLucideIcon,
  resolvePlaceCategoryUtilityLabelKey,
} from './place-category-registry';

describe('place-category-registry', () => {
  it('lists all guide tab categories', () => {
    expect(PLACE_CATEGORY_IDS).toEqual(['essential', 'food', 'bars', 'cafes', 'sights']);
  });

  it('resolves category icons', () => {
    expect(resolvePlaceCategoryLucideIcon('food')).toBe(UtensilsCrossed);
    expect(resolvePlaceCategoryLucideIcon('cafes')).toBe(Coffee);
    expect(resolvePlaceCategoryLucideIcon('bars')).toBe(Wine);
  });

  it('exposes utility label keys for compact essentials', () => {
    expect(resolvePlaceCategoryUtilityLabelKey('food')).toBe('essentials.lateFood');
    expect(resolvePlaceCategoryUtilityLabelKey('bars')).toBeUndefined();
  });

  it('provides admin labels', () => {
    expect(resolvePlaceCategoryAdminLabel('essential')).toBe('Essentials / info');
  });
});
