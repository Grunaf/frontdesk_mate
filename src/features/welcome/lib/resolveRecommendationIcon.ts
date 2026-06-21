import { resolvePlaceLucideIcon } from '@/entities/hostel';
import type { GuestRecommendation } from '../model/guestRecommendation';

export function resolveRecommendationThumbnailIcon(recommendation: GuestRecommendation) {
  return resolvePlaceLucideIcon({
    iconId: recommendation.iconId,
    category: recommendation.category,
    scope: recommendation.scope,
  });
}
