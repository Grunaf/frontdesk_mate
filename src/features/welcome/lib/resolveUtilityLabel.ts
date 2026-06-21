import { resolvePlaceUtilityLabelKey } from '@/entities/hostel';
import type { GuestRecommendation } from '../model/guestRecommendation';

type TranslateFn = (key: string) => string;

export function resolveUtilityShortLabel(
  recommendation: GuestRecommendation,
  translate: TranslateFn
): string {
  if (recommendation.category === 'food') {
    return translate('essentials.lateFood');
  }

  const labelKey = resolvePlaceUtilityLabelKey(recommendation.iconId);
  if (labelKey) {
    return translate(labelKey);
  }

  const firstWord = recommendation.name.trim().split(/\s+/)[0];
  return firstWord || recommendation.name;
}

export function buildUtilityTriggerLabel(
  utilities: GuestRecommendation[],
  translate: TranslateFn
): string {
  return utilities.map((utility) => resolveUtilityShortLabel(utility, translate)).join(' · ');
}
