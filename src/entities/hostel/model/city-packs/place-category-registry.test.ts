import { describe, expect, it } from 'vitest';
import { Coffee, UtensilsCrossed, Wine } from 'lucide-react';
import {
  PLACE_CATEGORY_IDS,
  isCityPackNeedNowEligibleCategory,
  resolvePlaceCategoryAdminLabel,
  resolvePlaceCategoryFromLegacy,
  resolvePlaceCategoryLucideIcon,
  resolvePlaceCategoryUtilityLabelKey,
} from './place-category-registry';

describe('place-category-registry', () => {
  it('lists all guide tab categories', () => {
    expect(PLACE_CATEGORY_IDS).toEqual(['essential', 'restaurants', 'bars', 'cafes', 'sights']);
  });

  it('resolves category icons', () => {
    expect(resolvePlaceCategoryLucideIcon('restaurants')).toBe(UtensilsCrossed);
    expect(resolvePlaceCategoryLucideIcon('cafes')).toBe(Coffee);
    expect(resolvePlaceCategoryLucideIcon('bars')).toBe(Wine);
  });

  it('exposes utility label keys for compact essentials', () => {
    expect(resolvePlaceCategoryUtilityLabelKey('restaurants')).toBe('essentials.lateFood');
    expect(resolvePlaceCategoryUtilityLabelKey('bars')).toBeUndefined();
  });

  it('provides admin labels', () => {
    expect(resolvePlaceCategoryAdminLabel('essential')).toBe('Essentials / info');
    expect(resolvePlaceCategoryAdminLabel('restaurants')).toBe('Restaurants');
  });

  it('maps legacy food to restaurants', () => {
    expect(resolvePlaceCategoryFromLegacy('food')).toBe('restaurants');
    expect(resolvePlaceCategoryFromLegacy('restaurants')).toBe('restaurants');
    expect(resolvePlaceCategoryFromLegacy('bars')).toBe('bars');
  });

  it('limits needNow-eligible categories', () => {
    expect(isCityPackNeedNowEligibleCategory('essential')).toBe(true);
    expect(isCityPackNeedNowEligibleCategory('cafes')).toBe(true);
    expect(isCityPackNeedNowEligibleCategory('restaurants')).toBe(false);
    expect(isCityPackNeedNowEligibleCategory('bars')).toBe(false);
    expect(isCityPackNeedNowEligibleCategory('sights')).toBe(false);
  });
});
