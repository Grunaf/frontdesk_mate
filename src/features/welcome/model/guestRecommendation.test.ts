import { describe, expect, it } from 'vitest';
import type { Place } from '@/entities/hostel';
import {
  buildMetaLine,
  getVisibleTabIds,
  hostelPlaceToGuestRecommendation,
  limitRecommendationsForAllTab,
  placeToGuestRecommendation,
  resolveActiveLocalGuideTab,
  resolvePrimaryBadge,
  sortGuestRecommendations,
  splitCityRecommendations,
} from './guestRecommendation';

const samplePlace: Place = {
  id: 'zeljo-cevapi',
  category: 'restaurants',
  name: 'Željo',
  descriptionKey: 'places.zeljo.desc',
  googleMapsUrl: 'https://maps.example/zeljo',
  isTopPick: true,
  needNow: false,
  walkHint: '5 min walk',
};

describe('guestRecommendation', () => {
  it('maps place fields to guest recommendation', () => {
    const recommendation = placeToGuestRecommendation(samplePlace, (key) => {
      if (key === 'places.zeljo.desc') return 'Traditional Bosnian food — legendary ćevapi.';
      return key;
    });

    expect(recommendation).toMatchObject({
      scope: 'city',
      name: 'Željo',
      why: 'Traditional Bosnian food — legendary ćevapi.',
      walkHint: '5 min walk',
      mapsUrl: 'https://maps.example/zeljo',
      isTopPick: true,
      needNow: false,
    });
  });

  it('maps iconId from place', () => {
    const recommendation = placeToGuestRecommendation(
      { ...samplePlace, iconId: 'pizza' },
      () => ''
    );

    expect(recommendation.iconId).toBe('pizza');
  });

  it('uses translated hostel category label when note is empty', () => {
    const recommendation = hostelPlaceToGuestRecommendation(
      {
        id: 'near-shop',
        name: 'Konzum',
        category: 'shop',
      },
      (key) => (key === 'hostelPlaceCategories.shop' ? 'Магазин' : key)
    );

    expect(recommendation.why).toBe('Магазин');
  });

  it('prefers custom note over category label for hostel places', () => {
    const recommendation = hostelPlaceToGuestRecommendation({
      id: 'near-shop',
      name: 'Konzum',
      category: 'shop',
      note: 'Open until 22:00',
    });

    expect(recommendation.why).toBe('Open until 22:00');
  });

  it('builds meta line from walkHint only', () => {
    expect(
      buildMetaLine({
        id: '1',
        scope: 'city',
        name: 'Test',
        category: 'restaurants',
        walkHint: '2 min walk',
      })
    ).toBe('2 min walk');
  });

  it('builds meta line with category on all tab', () => {
    expect(
      buildMetaLine(
        {
          id: '1',
          scope: 'city',
          name: 'Test',
          category: 'restaurants',
          walkHint: '5 min walk',
        },
        { activeTab: 'all', categoryLabel: 'Food' }
      )
    ).toBe('Food · 5 min walk');
  });

  it('shows top pick badge when flagged', () => {
    const recommendation = placeToGuestRecommendation(samplePlace, () => '');

    expect(resolvePrimaryBadge(recommendation, 'Top pick')).toEqual({
      kind: 'topPick',
      label: 'Top pick',
    });
  });

  it('splits utilities from explore recommendations', () => {
    const { utilities, explore } = splitCityRecommendations([
      {
        id: 'atm',
        scope: 'city',
        name: 'ATM',
        category: 'essential',
        needNow: true,
      },
      {
        id: 'zeljo',
        scope: 'city',
        name: 'Željo',
        category: 'restaurants',
        needNow: false,
      },
    ]);

    expect(utilities.map((entry) => entry.id)).toEqual(['atm']);
    expect(explore.map((entry) => entry.id)).toEqual(['zeljo']);
  });

  it('sorts top picks before other places', () => {
    const sorted = sortGuestRecommendations([
      {
        id: 'b',
        scope: 'city',
        name: 'Beta',
        category: 'bars',
        isTopPick: false,
      },
      {
        id: 'a',
        scope: 'city',
        name: 'Alpha',
        category: 'restaurants',
        isTopPick: true,
      },
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('limitRecommendationsForAllTab', () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `place-${index}`,
    scope: 'city' as const,
    name: `Place ${index}`,
    category: 'restaurants',
  }));

  it('limits all tab until expanded', () => {
    const limited = limitRecommendationsForAllTab(items, 'all', false, 6);
    expect(limited.visible).toHaveLength(6);
    expect(limited.hasMore).toBe(true);
    expect(limited.total).toBe(8);
  });
});

describe('local guide tabs', () => {
  const recommendations = [
    { id: '1', scope: 'city' as const, name: 'Food A', category: 'restaurants' },
    { id: '2', scope: 'city' as const, name: 'Bar A', category: 'bars' },
  ];

  it('hides empty category tabs', () => {
    expect(getVisibleTabIds(recommendations)).toEqual(['all', 'restaurants', 'bars']);
  });

  it('hides essential tab when all essential places are utilities', () => {
    const { explore } = splitCityRecommendations([
      {
        id: 'atm',
        scope: 'city',
        name: 'ATM',
        category: 'essential',
        needNow: true,
        iconId: 'atm',
      },
      {
        id: 'restaurants',
        scope: 'city',
        name: 'Željo',
        category: 'restaurants',
        needNow: false,
      },
    ]);

    expect(getVisibleTabIds(explore)).toEqual(['all', 'restaurants']);
  });

  it('falls back from empty preferred tab to first populated category', () => {
    expect(resolveActiveLocalGuideTab('restaurants', ['all', 'bars'], 'restaurants')).toBe('bars');
  });
});
