import { describe, expect, it } from 'vitest';
import type { Place } from '@/entities/hostel';
import {
  applyCityPackNeedNowPlaceIds,
  resolveCityPackNeedNowPlaceIdsForAdmin,
} from './applyCityPackNeedNowPlaceIds';

function place(id: string, needNow: boolean, category: Place['category'] = 'essential'): Place {
  return {
    id,
    name: id,
    category,
    googleMapsUrl: 'https://maps.google.com',
    isTopPick: false,
    needNow,
  };
}

describe('applyCityPackNeedNowPlaceIds', () => {
  it('keeps pack-level needNow for eligible categories when tenant list is undefined', () => {
    const places = [place('atm', true), place('cafe', false, 'cafes')];
    expect(applyCityPackNeedNowPlaceIds(places, {})).toEqual(places);
  });

  it('clears pack-level needNow on bars and sights when tenant list is undefined', () => {
    const places = [place('pub', true, 'bars'), place('museum', true, 'sights')];
    const result = applyCityPackNeedNowPlaceIds(places, {});
    expect(result?.every((entry) => entry.needNow === false)).toBe(true);
  });

  it('overrides needNow from tenant list when set', () => {
    const places = [
      place('atm', true),
      place('cafe', false, 'cafes'),
      place('pharmacy', true),
    ];
    const result = applyCityPackNeedNowPlaceIds(places, {
      cityPackNeedNowPlaceIds: ['cafe', 'pharmacy'],
    });

    expect(result?.map((entry) => ({ id: entry.id, needNow: entry.needNow }))).toEqual([
      { id: 'atm', needNow: false },
      { id: 'cafe', needNow: true },
      { id: 'pharmacy', needNow: true },
    ]);
  });

  it('ignores bars and sights even when listed in tenant ids', () => {
    const places = [place('pub', false, 'bars'), place('atm', false)];
    const result = applyCityPackNeedNowPlaceIds(places, {
      cityPackNeedNowPlaceIds: ['pub', 'atm'],
    });

    expect(result?.map((entry) => ({ id: entry.id, needNow: entry.needNow }))).toEqual([
      { id: 'pub', needNow: false },
      { id: 'atm', needNow: true },
    ]);
  });

  it('clears all utilities when tenant list is empty', () => {
    const places = [place('atm', true)];
    const result = applyCityPackNeedNowPlaceIds(places, { cityPackNeedNowPlaceIds: [] });
    expect(result?.[0]?.needNow).toBe(false);
  });
});

describe('resolveCityPackNeedNowPlaceIdsForAdmin', () => {
  it('seeds from pack needNow when tenant list is undefined', () => {
    expect(
      resolveCityPackNeedNowPlaceIdsForAdmin({}, [
        { id: 'atm', needNow: true, category: 'essential' },
        { id: 'cafe', needNow: false, category: 'cafes' },
      ])
    ).toEqual(['atm']);
  });

  it('filters explicit tenant list to eligible current pack places', () => {
    expect(
      resolveCityPackNeedNowPlaceIdsForAdmin(
        { cityPackNeedNowPlaceIds: ['atm', 'gone', 'pub'] },
        [
          { id: 'atm', needNow: false, category: 'essential' },
          { id: 'pub', needNow: true, category: 'bars' },
        ]
      )
    ).toEqual(['atm']);
  });

  it('excludes restaurants and legacy food from eligibility', () => {
    expect(
      resolveCityPackNeedNowPlaceIdsForAdmin({}, [
        { id: 'pizza', needNow: true, category: 'food' },
        { id: 'bistro', needNow: true, category: 'restaurants' },
        { id: 'atm', needNow: true, category: 'essential' },
      ])
    ).toEqual(['atm']);
  });
});
