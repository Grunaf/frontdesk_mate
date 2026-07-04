import { describe, expect, it } from 'vitest';
import { Pizza, UtensilsCrossed, Wine } from 'lucide-react';
import { resolveRecommendationThumbnailIcon } from './resolveRecommendationIcon';
import type { GuestRecommendation } from '../model/guestRecommendation';

describe('resolveRecommendationThumbnailIcon', () => {
  const base: GuestRecommendation = {
    id: '1',
    scope: 'city',
    name: 'Test',
    category: 'restaurants',
  };

  it('uses preset icon when iconId is set', () => {
    expect(resolveRecommendationThumbnailIcon({ ...base, iconId: 'pizza' })).toBe(Pizza);
  });

  it('falls back to category icon when iconId is missing', () => {
    expect(resolveRecommendationThumbnailIcon(base)).toBe(UtensilsCrossed);
  });

  it('falls back to category icon for bars', () => {
    expect(resolveRecommendationThumbnailIcon({ ...base, category: 'bars' })).toBe(Wine);
  });
});
