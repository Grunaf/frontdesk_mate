import type { CityPackRouteContent, CityPackTransportCurrencyMode } from '../model/types';

function clampRange(range: { min: number; max: number }): { min: number; max: number } {
  let min = Math.max(0, Number(range.min) || 0);
  let max = Math.max(0, Number(range.max) || 0);
  if (min > max) {
    [min, max] = [max, min];
  }
  return { min, max };
}

export function normalizeRouteTaxiForCurrency(
  route: CityPackRouteContent,
  mode: CityPackTransportCurrencyMode
): CityPackRouteContent {
  const priceEUR = clampRange(route.taxi.priceEUR);
  let priceKM = clampRange(route.taxi.priceKM);
  const durationMin = clampRange(route.taxi.durationMin);

  if (mode === 'eur_only') {
    if (priceEUR.min > 0 || priceEUR.max > 0) {
      priceKM = { ...priceEUR };
    } else if (priceKM.min > 0 || priceKM.max > 0) {
      priceEUR.min = priceKM.min;
      priceEUR.max = priceKM.max;
      priceKM = { ...priceEUR };
    }
  }

  const transit = {
    ...route.transit,
    durationMin: Math.max(0, Number(route.transit.durationMin) || 0),
    stops: route.transit.stops != null ? Math.max(0, Number(route.transit.stops)) : undefined,
    ticketPrice: route.transit.ticketPrice
      ? {
          kioskKM: Math.max(0, Number(route.transit.ticketPrice.kioskKM) || 0),
          driverKM: Math.max(0, Number(route.transit.ticketPrice.driverKM) || 0),
        }
      : undefined,
  };

  return {
    ...route,
    transit,
    taxi: { priceEUR, priceKM, durationMin },
  };
}
