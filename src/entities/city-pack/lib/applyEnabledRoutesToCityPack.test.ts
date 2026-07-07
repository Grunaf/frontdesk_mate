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

  it('derives hub categories for dynamic packs from enabled routes', () => {
    const base = getCityPack('tivat');
    const kotorRoutes = getCityPack('kotor').routes;
    const pack = {
      ...base,
      routes: {
        airport: kotorRoutes.airport!,
        bus_central: kotorRoutes.bus_central!,
      },
    };

    const filtered = applyEnabledRoutesToCityPack(pack, ['airport', 'bus_central']);

    expect(filtered.categories.map((category) => category.id)).toEqual(['airport', 'bus']);
    expect(filtered.categories[0]?.labelKey).toBe('pages.arrivalJourney.directions.hubs.airport');
  });

  it('sets defaultRouteId to first enabled route in the hub category', () => {
    const base = getCityPack('sarajevo');
    const filtered = applyEnabledRoutesToCityPack(base, ['bus_istochno']);

    expect(filtered.categories).toHaveLength(1);
    expect(filtered.categories[0]?.id).toBe('bus');
    expect(filtered.categories[0]?.defaultRouteId).toBe('bus_istochno');
  });
});
