import { describe, expect, it } from 'vitest';
import {
  getCityPack,
  isCityPackId,
  isCodeCityPackId,
} from './index';

describe('city pack ids', () => {
  it('accepts lowercase slug ids from DB', () => {
    expect(isCityPackId('dubrovnik')).toBe(true);
    expect(isCityPackId('sarajevo')).toBe(true);
    expect(isCityPackId('Sarajevo')).toBe(false);
    expect(isCityPackId('')).toBe(false);
  });

  it('distinguishes code-backed packs', () => {
    expect(isCodeCityPackId('sarajevo')).toBe(true);
    expect(isCodeCityPackId('dubrovnik')).toBe(false);
  });

  it('builds a dynamic shell for unknown DB packs', () => {
    const pack = getCityPack('dubrovnik');

    expect(pack.id).toBe('dubrovnik');
    expect(pack.places).toEqual([]);
    expect(pack.categories).toEqual([]);
    expect(Object.keys(pack.routes)).toHaveLength(0);
    expect(pack.locale.guideNamespace).toContain('dubrovnik');
  });

  it('keeps only active kotor routes in code pack', () => {
    const pack = getCityPack('kotor');

    expect(Object.keys(pack.routes).sort()).toEqual(['airport', 'bus_central']);
  });
});
