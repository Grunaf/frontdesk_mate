import { describe, expect, it } from 'vitest';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import { mergeCityPackContentForSave, normalizeCityPackRoutes } from './normalizeCityPackRoutes';

describe('normalizeCityPackRoutes', () => {
  it('keeps only enabled routes on save', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');
    const merged = mergeCityPackContentForSave(
      {
        enabledRoutes: ['airport', 'bus_central'],
        routes,
      },
      ['airport']
    );

    expect(Object.keys(merged.routes ?? {})).toEqual(['airport']);
    expect(merged.routes?.airport?.copy.publicTitle.en).toContain('Trolleybus');
  });

  it('drops incomplete route copy', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');
    const airport = routes.airport!;
    const normalized = normalizeCityPackRoutes({
      airport: {
        ...airport,
        copy: {
          ...airport.copy,
          publicTitle: { en: '' },
        },
      },
    });

    expect(normalized?.airport).toBeUndefined();
  });
});
