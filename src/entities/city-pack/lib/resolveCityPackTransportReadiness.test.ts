import { describe, expect, it } from 'vitest';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import { createBlankCityPackRouteContent } from './resolveAdminCityPackTransport';
import {
  formatRouteGateStatus,
  resolveCityPackTransportReadiness,
  resolveRouteGateMissingFields,
} from './resolveCityPackTransportReadiness';

describe('resolveRouteGateMissingFields', () => {
  it('lists all gate fields when route is missing', () => {
    expect(resolveRouteGateMissingFields(undefined)).toEqual([
      'Card title',
      'Card summary',
      'Walk to stop',
      'Step-by-step',
      'Get off at',
    ]);
  });

  it('lists only empty EN gate fields', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicTitle = { en: 'Title' };

    expect(resolveRouteGateMissingFields(route)).toEqual([
      'Card summary',
      'Walk to stop',
      'Step-by-step',
      'Get off at',
    ]);
  });

  it('requires Walk to stop for transit hubs', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.copy.publicTitle = { en: 'Title' };
    route.copy.publicSummary = { en: 'Summary' };
    route.copy.publicText = { en: 'Steps' };
    route.copy.publicGetOffAt = { en: 'Stop' };

    expect(resolveRouteGateMissingFields(route)).toEqual(['Walk to stop']);
  });

  it('skips Get off at for walk-only hubs', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.routeMode = 'walk_only';
    route.copy.publicTitle = { en: 'Title' };
    route.copy.publicSummary = { en: 'Summary' };
    route.copy.publicText = { en: 'Steps' };

    expect(resolveRouteGateMissingFields(route)).toEqual([]);
  });

  it('skips all copy gates for tenant_local hubs', () => {
    const route = createBlankCityPackRouteContent('bus_central');
    route.hubArrivalKind = 'tenant_local';

    expect(resolveRouteGateMissingFields(route)).toEqual([]);
    expect(formatRouteGateStatus(route)).toMatchObject({
      ready: true,
      shortLabel: 'Local',
      statusLabel: 'Local — tenant owns path',
    });
  });

  it('formats Ready vs Missing status', () => {
    const routes = buildCityPackRoutesFromCode('sarajevo');
    expect(formatRouteGateStatus(routes.airport)).toMatchObject({
      statusLabel: 'Ready',
      shortLabel: 'Ready',
    });
    const blank = formatRouteGateStatus(createBlankCityPackRouteContent('airport'));
    expect(blank.statusLabel).toMatch(/^Missing:/);
    expect(blank.shortLabel).toBe('Missing (5)');
  });
});

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
