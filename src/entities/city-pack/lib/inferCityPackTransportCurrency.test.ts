import { describe, expect, it } from 'vitest';
import { inferCityPackTransportCurrencyMode } from './inferCityPackTransportCurrency';
import { normalizeRouteTaxiForCurrency } from './normalizeRouteTaxiForCurrency';
import { createBlankCityPackRouteContent } from './resolveAdminCityPackTransport';

describe('inferCityPackTransportCurrencyMode', () => {
  it('defaults to eur_only for dynamic packs', () => {
    expect(inferCityPackTransportCurrencyMode('tivat', {})).toBe('eur_only');
  });

  it('infers sarajevo as local_and_eur', () => {
    expect(inferCityPackTransportCurrencyMode('sarajevo', {})).toBe('local_and_eur');
  });

  it('respects stored mode', () => {
    expect(
      inferCityPackTransportCurrencyMode('tivat', {
        transportCurrency: { mode: 'local_and_eur' },
      })
    ).toBe('local_and_eur');
  });
});

describe('normalizeRouteTaxiForCurrency', () => {
  it('syncs KM from EUR for eur_only', () => {
    const route = createBlankCityPackRouteContent('airport');
    route.taxi.priceEUR = { min: 8, max: 15 };
    const normalized = normalizeRouteTaxiForCurrency(route, 'eur_only');
    expect(normalized.taxi.priceKM).toEqual({ min: 8, max: 15 });
  });
});
