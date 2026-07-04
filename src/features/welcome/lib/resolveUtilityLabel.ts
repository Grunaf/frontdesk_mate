import {
  resolvePlaceCategoryUtilityLabelKey,
  resolvePlaceUtilityLabelKey,
} from '@/entities/hostel';
import type { GuestRecommendation } from '../model/guestRecommendation';

type TranslateFn = (key: string) => string;

export function resolveUtilityShortLabel(
  recommendation: GuestRecommendation,
  translate: TranslateFn
): string {
  const categoryLabelKey = resolvePlaceCategoryUtilityLabelKey(recommendation.category);
  if (categoryLabelKey) {
    return translate(categoryLabelKey);
  }

  const labelKey = resolvePlaceUtilityLabelKey(recommendation.iconId);
  if (labelKey) {
    return translate(labelKey);
  }

  const firstWord = recommendation.name.trim().split(/\s+/)[0];
  return firstWord || recommendation.name;
}
