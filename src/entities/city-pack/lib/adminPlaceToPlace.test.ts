import { describe, expect, it } from 'vitest';
import { adminPlaceToPlace, adminPlacesToPlaces } from '@/entities/city-pack/lib/adminPlaceToPlace';

describe('adminPlaceToPlace', () => {
  it('maps legacy food category to restaurants', () => {
    const place = adminPlaceToPlace({
      id: 'pizza',
      name: 'Pizza',
      category: 'food' as 'restaurants',
      googleMapsUrl: 'https://maps.example/pizza',
    });

    expect(place.category).toBe('restaurants');
  });

  it('maps admin fields to runtime place', () => {
    const place = adminPlaceToPlace({
      id: 'zeljo-cevapi',
      name: 'Željo',
      category: 'restaurants',
      description: 'Traditional Bosnian food',
      googleMapsUrl: 'https://maps.example/zeljo',
      isTopPick: true,
      needNow: false,
      walkHint: '5 min walk',
      iconId: 'restaurant',
    });

    expect(place).toMatchObject({
      name: 'Željo',
      description: 'Traditional Bosnian food',
      descriptionKey: '',
      googleMapsUrl: 'https://maps.example/zeljo',
      isTopPick: true,
      needNow: false,
      walkHint: '5 min walk',
      iconId: 'restaurant',
    });
  });

  it('builds maps url from coordinates when googleMapsUrl is missing', () => {
    const place = adminPlaceToPlace({
      id: 'atm',
      name: 'ATM',
      category: 'essential',
      lat: 43.85,
      lng: 18.39,
    });

    expect(place.googleMapsUrl).toBe('https://maps.google.com/?q=43.85,18.39');
  });

  it('clears default icon id', () => {
    const place = adminPlaceToPlace({
      id: 'shop',
      name: 'Shop',
      category: 'essential',
      iconId: 'default',
    });

    expect(place.iconId).toBeUndefined();
  });
});

describe('adminPlacesToPlaces', () => {
  it('returns empty list when admin places are missing', () => {
    expect(adminPlacesToPlaces(undefined)).toEqual([]);
    expect(adminPlacesToPlaces([])).toEqual([]);
  });

  it('filters unnamed or uncategorized places', () => {
    const places = adminPlacesToPlaces([
      { id: 'a', name: 'ATM', category: 'essential' },
      { id: 'b', name: ' ', category: 'restaurants' },
      { id: 'c', name: 'Cafe', category: 'cafes' },
    ]);

    expect(places.map((place) => place.id)).toEqual(['a', 'c']);
  });

  it('sorts top picks before other places', () => {
    const places = adminPlacesToPlaces([
      {
        id: 'b',
        name: 'Beta Bar',
        category: 'bars',
        isTopPick: false,
      },
      {
        id: 'a',
        name: 'Alpha Cafe',
        category: 'cafes',
        isTopPick: true,
      },
    ]);

    expect(places.map((place) => place.id)).toEqual(['a', 'b']);
  });
});
