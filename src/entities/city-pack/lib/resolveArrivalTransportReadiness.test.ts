import { describe, expect, it } from 'vitest';
import type { RouteId } from '@/entities/hostel';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import {
  buildTenantWalkSeedFromCityTemplates,
  resolveArrivalWalkPreviewText,
  resolveArrivalWalkReadiness,
} from './resolveArrivalTransportReadiness';
import { resolveLocalizedText } from '@/entities/city-pack/model/localized';

describe('resolveArrivalWalkReadiness', () => {
  const cityPackContent: CityPackContent = {
    enabledRoutes: ['airport', 'bus_central'] satisfies RouteId[],
    routes: buildCityPackRoutesFromCode('sarajevo'),
  };

  it('is incomplete when pack has no enabled arrival routes', () => {
    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'custom-pack',
        settings: {},
        cityPackContent: { enabledRoutes: [], routes: {}, places: [] },
      })
    ).toEqual({
      complete: false,
      detail: 'City pack has no arrival routes enabled.',
    });
  });

  it('is incomplete when only city templates exist (tenant must fill last mile)', () => {
    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'sarajevo',
        settings: {},
        cityPackContent,
      }).complete
    ).toBe(false);
  });

  it('is incomplete when a route has no tenant walk text', () => {
    const result = resolveArrivalWalkReadiness({
      cityPackId: 'custom-pack',
      settings: {},
      cityPackContent: {
        enabledRoutes: ['airport'],
        routes: {
          airport: {
            ...buildCityPackRoutesFromCode('sarajevo').airport!,
            copy: {
              ...buildCityPackRoutesFromCode('sarajevo').airport!.copy,
              publicWalkToHostel: { en: '' },
            },
          },
        },
      },
    });

    expect(result.complete).toBe(false);
    expect(result.detail).toMatch(/Airport/i);
  });

  it('is complete when tenant global walk is set', () => {
    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'custom-pack',
        settings: {
          arrivalWalkToHostel: 'Go left at the corner',
          arrivalWalkMapsUrlByRoute: { airport: 'https://www.google.com/maps/dir/?api=1&destination=Hostel' },
        },
        cityPackContent: {
          enabledRoutes: ['airport'],
          routes: {},
        },
      }).complete
    ).toBe(true);
  });

  it('is incomplete when walk is set but walking Maps link is missing', () => {
    const result = resolveArrivalWalkReadiness({
      cityPackId: 'custom-pack',
      settings: {
        arrivalWalkToHostel: 'Go left at the corner',
      },
      cityPackContent: {
        enabledRoutes: ['airport'],
        routes: {},
      },
    });
    expect(result.complete).toBe(false);
    expect(result.detail).toMatch(/walking Maps link/i);
  });

  it('requires Local full path + Maps for tenant_local hubs', () => {
    const airport = {
      ...buildCityPackRoutesFromCode('sarajevo').airport!,
      hubArrivalKind: 'tenant_local' as const,
    };
    const incomplete = resolveArrivalWalkReadiness({
      cityPackId: 'custom-pack',
      settings: {
        arrivalWalkMapsUrlByRoute: {
          airport: 'https://www.google.com/maps/dir/?api=1&destination=Hostel',
        },
      },
      cityPackContent: {
        enabledRoutes: ['airport'],
        routes: { airport },
      },
    });
    expect(incomplete.complete).toBe(false);
    expect(incomplete.detail).toMatch(/Local hubs/i);

    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'custom-pack',
        settings: {
          arrivalLocalByRoute: {
            airport: {
              mode: 'walk',
              primaryText: { en: 'Walk from the plaza to our door.' },
            },
          },
          arrivalWalkMapsUrlByRoute: {
            airport: 'https://www.google.com/maps/dir/?api=1&destination=Hostel',
          },
        },
        cityPackContent: {
          enabledRoutes: ['airport'],
          routes: { airport },
        },
      }).complete
    ).toBe(true);
  });

  it('is complete when tenant per-route walk is set', () => {
    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'sarajevo',
        settings: {
          arrivalWalkToHostelByRoute: {
            airport: 'Walk from the stop to our door',
          },
          arrivalWalkMapsUrlByRoute: {
            airport: 'https://www.google.com/maps/dir/?api=1&destination=Hostel',
          },
        },
        cityPackContent,
      }).complete
    ).toBe(false);

    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'sarajevo',
        settings: {
          arrivalWalkToHostelByRoute: {
            airport: 'Walk from the stop to our door',
            bus_central: 'Enter the courtyard',
          },
          arrivalWalkMapsUrlByRoute: {
            airport: 'https://www.google.com/maps/dir/?api=1&destination=Hostel',
            bus_central: 'https://www.google.com/maps/dir/?api=1&destination=Hostel',
          },
        },
        cityPackContent,
      }).complete
    ).toBe(true);
  });
});

describe('buildTenantWalkSeedFromCityTemplates', () => {
  it('copies city walk templates into empty per-route tenant fields', () => {
    const cityPackContent: CityPackContent = {
      enabledRoutes: ['airport'],
      routes: buildCityPackRoutesFromCode('sarajevo'),
    };

    const seed = buildTenantWalkSeedFromCityTemplates({
      cityPackId: 'sarajevo',
      cityPackContent,
      settings: {},
    });

    expect(resolveLocalizedText(seed.arrivalWalkToHostelByRoute?.airport, 'en')).toContain(
      'Dalmatinska'
    );
  });
});

describe('resolveArrivalWalkPreviewText', () => {
  it('returns city default walk text for admin preview', () => {
    const text = resolveArrivalWalkPreviewText({
      cityPackId: 'sarajevo',
      routeId: 'airport',
      cityPackContent: {
        routes: buildCityPackRoutesFromCode('sarajevo'),
      },
    });

    expect(text).toContain('Dalmatinska');
  });
});
