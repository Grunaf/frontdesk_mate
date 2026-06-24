import { describe, expect, it } from 'vitest';
import type { RouteId } from '@/entities/hostel';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import {
  resolveArrivalWalkPreviewText,
  resolveArrivalWalkReadiness,
} from './resolveArrivalTransportReadiness';

describe('resolveArrivalWalkReadiness', () => {
  const cityPackContent: CityPackContent = {
    enabledRoutes: ['airport', 'bus_central'] satisfies RouteId[],
    routes: buildCityPackRoutesFromCode('sarajevo'),
  };

  it('is complete when city defaults exist', () => {
    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'sarajevo',
        settings: {},
        cityPackContent,
      }).complete
    ).toBe(true);
  });

  it('is incomplete when a route has no city or tenant walk text', () => {
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

  it('respects tenant global override', () => {
    expect(
      resolveArrivalWalkReadiness({
        cityPackId: 'custom-pack',
        settings: { arrivalWalkToHostel: 'Go left at the corner' },
        cityPackContent: {
          enabledRoutes: ['airport'],
          routes: {},
        },
      }).complete
    ).toBe(true);
  });
});

describe('resolveArrivalWalkPreviewText', () => {
  it('returns city default walk text', () => {
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
