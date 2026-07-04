import { describe, expect, it } from 'vitest';
import {
  contentHasLegacyCityPackPlaces,
  findLegacyCityPackPlaceKeys,
  migrateCityPackAdminPlaceV3,
  migrateCityPackContentV3,
  resolveIsTopPickFromLegacy,
  resolveNeedNowFromLegacy,
} from './migrateCityPackPlaceV3';

describe('migrateCityPackPlaceV3', () => {
  it('prefers explicit isTopPick over legacy tag', () => {
    expect(
      resolveIsTopPickFromLegacy({ isTopPick: false, tag: 'TOP PICK' })
    ).toBe(false);
    expect(resolveIsTopPickFromLegacy({ tag: 'TOP PICK' })).toBe(true);
  });

  it('maps legacy food category to restaurants', () => {
    expect(migrateCityPackAdminPlaceV3({ id: 'a', category: 'food' }).category).toBe(
      'restaurants'
    );
  });

  it('prefers explicit needNow over legacy isSurvival and tag', () => {
    expect(
      resolveNeedNowFromLegacy({ needNow: false, isSurvival: true, tag: 'LATE NIGHT BITES' })
    ).toBe(false);
    expect(resolveNeedNowFromLegacy({ isSurvival: true })).toBe(true);
    expect(resolveNeedNowFromLegacy({ tag: 'LATE NIGHT BITES' })).toBe(true);
  });

  it('removes legacy keys and sets v3 flags', () => {
    const migrated = migrateCityPackAdminPlaceV3({
      id: 'atm',
      name: 'ATM',
      category: 'essential',
      tag: 'ESSENTIAL',
      isSurvival: true,
      recommendedBy: 'Edin',
      photoUrl: 'https://example.com/a.jpg',
      priority: 1,
      subCategory: 'Cash',
    });

    expect(migrated).toEqual({
      id: 'atm',
      name: 'ATM',
      category: 'essential',
      isTopPick: false,
      needNow: true,
    });
    expect(findLegacyCityPackPlaceKeys(migrated)).toEqual([]);
  });

  it('migrates all places inside content', () => {
    const migrated = migrateCityPackContentV3({
      places: [
        { id: 'a', tag: 'TOP PICK', isSurvival: false },
        { id: 'b', isTopPick: true, needNow: false },
      ],
      enabledRoutes: ['airport'],
    });

    expect(migrated.places).toEqual([
      { id: 'a', isTopPick: true, needNow: false },
      { id: 'b', isTopPick: true, needNow: false },
    ]);
    expect(migrated.enabledRoutes).toEqual(['airport']);
    expect(contentHasLegacyCityPackPlaces(migrated)).toBe(false);
  });

  it('detects legacy keys in content', () => {
    expect(
      contentHasLegacyCityPackPlaces({
        places: [{ id: 'a', isTopPick: true, needNow: false, tag: 'BONUS' }],
      })
    ).toBe(true);
  });
});
