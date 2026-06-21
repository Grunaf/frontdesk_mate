import { describe, expect, it } from 'vitest';
import { getCityPack } from '@/entities/hostel';
import { applyEnabledRoutesToCityPack } from './applyEnabledRoutesToCityPack';

describe('applyEnabledRoutesToCityPack', () => {
  it('filters sarajevo routes and categories by enabledRoutes', () => {
    const base = getCityPack('sarajevo');
    const filtered = applyEnabledRoutesToCityPack(base, ['airport', 'bus_central']);

    expect(Object.keys(filtered.routes).sort()).toEqual(['airport', 'bus_central']);
    expect(filtered.categories.map((category) => category.id)).toEqual(['airport', 'bus']);
  });

  it('keeps only kotor routes that exist in code pack', () => {
    const base = getCityPack('kotor');
    const filtered = applyEnabledRoutesToCityPack(base, ['airport', 'bus_central']);

    expect(Object.keys(filtered.routes).sort()).toEqual(['airport', 'bus_central']);
    expect(filtered.categories.map((category) => category.id)).toEqual(['airport', 'bus']);
  });

  it('returns empty routes when enabledRoutes is empty', () => {
    const base = getCityPack('sarajevo');
    const filtered = applyEnabledRoutesToCityPack(base, []);

    expect(filtered.routes).toEqual({});
    expect(filtered.categories).toEqual([]);
  });

  it('ignores enabled ids missing from code pack', () => {
    const base = getCityPack('kotor');
    const filtered = applyEnabledRoutesToCityPack(base, ['airport', 'train_station']);

    expect(Object.keys(filtered.routes)).toEqual(['airport']);
    expect(filtered.categories.map((category) => category.id)).toEqual(['airport']);
  });
});
