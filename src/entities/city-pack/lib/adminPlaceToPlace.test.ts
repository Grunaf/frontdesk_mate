import { describe, expect, it } from 'vitest';
import { SARAJEVO_PLACES } from '@/entities/hostel/model/city-packs/sarajevo.places';
import {
  adminPlaceToPlace,
  mergeCityPackPlaces,
} from '@/entities/city-pack/lib/adminPlaceToPlace';

describe('mergeCityPackPlaces', () => {
  const codePlace = SARAJEVO_PLACES.find((place) => place.id === 'zeljo-cevapi')!;

  it('returns code places when admin list is empty', () => {
    const merged = mergeCityPackPlaces(SARAJEVO_PLACES, undefined);
    expect(merged).toHaveLength(SARAJEVO_PLACES.length);
    expect(merged.find((place) => place.id === 'zeljo-cevapi')?.descriptionKey).toBe(
      'places.zeljo.desc'
    );
  });

  it('keeps i18n keys when admin overrides name only', () => {
    const merged = mergeCityPackPlaces(SARAJEVO_PLACES, [
      {
        id: 'zeljo-cevapi',
        name: 'Željo (updated)',
        category: 'food',
        isTopPick: true,
        googleMapsUrl: 'https://maps.example/zeljo',
      },
    ]);

    const place = merged.find((entry) => entry.id === 'zeljo-cevapi');
    expect(place?.name).toBe('Željo (updated)');
    expect(place?.descriptionKey).toBe('places.zeljo.desc');
    expect(place?.isTopPick).toBe(true);
  });

  it('uses admin description override', () => {
    const merged = mergeCityPackPlaces(SARAJEVO_PLACES, [
      {
        id: 'atm-dalmatinska',
        name: 'ATM UniCredit / Raiffeisen',
        category: 'essential',
        needNow: true,
        description: 'Custom ATM note',
        googleMapsUrl: 'https://maps.example/atm',
      },
    ]);

    const place = merged.find((entry) => entry.id === 'atm-dalmatinska');
    expect(place?.description).toBe('Custom ATM note');
    expect(place?.descriptionKey).toBe('places.atm.desc');
    expect(place?.needNow).toBe(true);
  });

  it('falls back to code maps url and flags', () => {
    const place = adminPlaceToPlace(
      {
        id: codePlace.id,
        name: codePlace.name,
        category: codePlace.category,
      },
      codePlace
    );

    expect(place.googleMapsUrl).toBe(codePlace.googleMapsUrl);
    expect(place.needNow).toBe(false);
    expect(place.isTopPick).toBe(true);
    expect(place.descriptionKey).toBe(codePlace.descriptionKey);
  });

  it('merges iconId from admin with code fallback', () => {
    const fromAdmin = adminPlaceToPlace(
      {
        id: codePlace.id,
        name: codePlace.name,
        category: codePlace.category,
        iconId: 'pizza',
      },
      codePlace
    );

    expect(fromAdmin.iconId).toBe('pizza');

    const fromCode = adminPlaceToPlace(
      {
        id: codePlace.id,
        name: codePlace.name,
        category: codePlace.category,
      },
      { ...codePlace, iconId: 'pub' }
    );

    expect(fromCode.iconId).toBe('pub');

    const cleared = adminPlaceToPlace(
      {
        id: codePlace.id,
        name: codePlace.name,
        category: codePlace.category,
        iconId: 'default',
      },
      { ...codePlace, iconId: 'pub' }
    );

    expect(cleared.iconId).toBeUndefined();
  });

  it('sorts top picks before other places', () => {
    const merged = mergeCityPackPlaces([], [
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

    expect(merged.map((place) => place.id)).toEqual(['a', 'b']);
  });
});
