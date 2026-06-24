import { describe, expect, it } from 'vitest';
import type { RouteId } from '@/entities/hostel';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import {
  buildTenantWalkSeedFromCityTemplates,
  resolveArrivalWalkPreviewText,
  resolveArrivalWalkReadiness,
} from './resolveArrivalTransportReadiness';

describe('resolveArrivalWalkReadiness', () => {
  const cityPackContent: CityPackContent = {
    enabledRoutes: ['airport', 'bus_central'] satisfies RouteId[],
    routes: buildCityPackRoutesFromCode('sarajevo'),
  };

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
        settings: { arrivalWalkToHostel: { en: 'Go left at the corner' } },
        cityPackContent: {
          enabledRoutes: ['airport'],
          routes: {},
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
            airport: { en: 'Walk from the stop to our door' },
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
            airport: { en: 'Walk from the stop to our door' },
            bus_central: { en: 'Enter the courtyard' },
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

    expect(seed.arrivalWalkToHostelByRoute?.airport?.en).toContain('Dalmatinska');
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
