import type { LucideIcon } from 'lucide-react';
import { Banknote, Coffee, Landmark, UtensilsCrossed, Wine } from 'lucide-react';
import type { PlaceCategory } from './places.types';

export const PLACE_CATEGORY_REGISTRY: {
  id: PlaceCategory;
  adminLabel: string;
  guideTabKey: string;
  lucideIcon: LucideIcon;
  utilityLabelKey?: string;
}[] = [
  {
    id: 'essential',
    adminLabel: 'Essentials / info',
    guideTabKey: 'tabs.essential',
    lucideIcon: Banknote,
  },
  {
    id: 'food',
    adminLabel: 'Food',
    guideTabKey: 'tabs.food',
    lucideIcon: UtensilsCrossed,
    utilityLabelKey: 'essentials.lateFood',
  },
  {
    id: 'bars',
    adminLabel: 'Bars',
    guideTabKey: 'tabs.bars',
    lucideIcon: Wine,
  },
  {
    id: 'cafes',
    adminLabel: 'Cafes',
    guideTabKey: 'tabs.cafes',
    lucideIcon: Coffee,
  },
  {
    id: 'sights',
    adminLabel: 'Sights',
    guideTabKey: 'tabs.sights',
    lucideIcon: Landmark,
  },
];

export const PLACE_CATEGORY_IDS = PLACE_CATEGORY_REGISTRY.map((entry) => entry.id);

const CATEGORY_BY_ID = Object.fromEntries(
  PLACE_CATEGORY_REGISTRY.map((entry) => [entry.id, entry])
) as Record<PlaceCategory, (typeof PLACE_CATEGORY_REGISTRY)[number]>;

export function isPlaceCategory(value: string): value is PlaceCategory {
  return value in CATEGORY_BY_ID;
}

export function resolvePlaceCategoryLucideIcon(category: PlaceCategory): LucideIcon {
  return CATEGORY_BY_ID[category].lucideIcon;
}

export function resolvePlaceCategoryUtilityLabelKey(category: string): string | undefined {
  if (!isPlaceCategory(category)) {
    return undefined;
  }

  return CATEGORY_BY_ID[category].utilityLabelKey;
}

export function resolvePlaceCategoryAdminLabel(category: PlaceCategory): string {
  return CATEGORY_BY_ID[category].adminLabel;
}

export function resolvePlaceCategoryGuideTabKey(category: PlaceCategory): string {
  return CATEGORY_BY_ID[category].guideTabKey;
}
