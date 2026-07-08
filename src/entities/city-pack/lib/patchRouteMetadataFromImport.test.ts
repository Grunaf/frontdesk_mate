import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from './resolveAdminCityPackTransport';
import { patchRouteMetadataFromImport } from './patchRouteMetadataFromImport';

describe('patchRouteMetadataFromImport', () => {
  it('applies single taxi values as exact min/max', () => {
    const route = createBlankCityPackRouteContent('airport');
    const next = patchRouteMetadataFromImport(
      route,
      { taxiEur: 21, taxiKm: 41, taxiDuration: 19 },
      'local_and_eur'
    );

    expect(next.taxi.priceEUR).toEqual({ min: 21, max: 21 });
    expect(next.taxi.priceKM).toEqual({ min: 41, max: 41 });
    expect(next.taxi.durationMin).toEqual({ min: 19, max: 19 });
  });

  it('prefers single values when both single and min/max are provided', () => {
    const route = createBlankCityPackRouteContent('airport');
    const next = patchRouteMetadataFromImport(
      route,
      { taxiEur: 20, taxiEurMin: 10, taxiEurMax: 30 },
      'eur_only'
    );

    expect(next.taxi.priceEUR).toEqual({ min: 20, max: 20 });
  });
});
