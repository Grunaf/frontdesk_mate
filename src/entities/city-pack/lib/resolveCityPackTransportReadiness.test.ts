import { describe, expect, it } from 'vitest';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import { resolveCityPackTransportReadiness } from './resolveCityPackTransportReadiness';

describe('resolveCityPackTransportReadiness', () => {
  it('is false when enabled routes are missing', () => {
    expect(
      resolveCityPackTransportReadiness({
        packId: 'tivat',
        content: { enabledRoutes: [], places: [] },
      })
    ).toMatchObject({
      ready: false,
      detail: 'City pack has no arrival routes enabled.',
    });
  });

  it('is false when enabled routes exist but route bodies are empty (DB-only pack)', () => {
    const result = resolveCityPackTransportReadiness({
      packId: 'tivat',
      content: {
        enabledRoutes: ['airport', 'bus_central'],
        places: [],
      },
    });

    expect(result.ready).toBe(false);
    expect(result.detail).toMatch(/Fill route content/i);
    expect(result.missingRouteLabels).toEqual(['Airport', 'Bus station']);
  });

  it('is true for code-seed pack when enabled routes have guest EN copy', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');

    expect(
      resolveCityPackTransportReadiness({
        packId: 'sarajevo',
        content: {
          enabledRoutes: ['airport', 'bus_central'],
          routes,
        },
      }).ready
    ).toBe(true);
  });

  it('is false when an enabled route is missing from resolved routes', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');

    expect(
      resolveCityPackTransportReadiness({
        packId: 'sarajevo',
        content: {
          enabledRoutes: ['airport', 'train_station'],
          routes: { airport: routes.airport },
        },
      }).ready
    ).toBe(false);
  });
});
