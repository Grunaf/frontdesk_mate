import type { RouteId } from '@/entities/hostel';
import type {
  CityPackRouteContent,
  CityPackRouteTaxi,
  CityPackRouteTransit,
  CityPackTransportCurrencyMode,
} from '../model/types';
import { resolveCodeCityPackRouteSeed } from './resolveAdminCityPackTransport';

function isRangeEmpty(range: { min: number; max: number }): boolean {
  return range.min <= 0 && range.max <= 0;
}

function isTaxiMetadataEmpty(taxi: CityPackRouteTaxi): boolean {
  return (
    isRangeEmpty(taxi.priceEUR) &&
    isRangeEmpty(taxi.priceKM) &&
    isRangeEmpty(taxi.durationMin)
  );
}

function isTransitDurationEmpty(transit: CityPackRouteTransit): boolean {
  return (transit.durationMin ?? 0) <= 0;
}

/** Default taxi/transit numbers from code seed or generic hub presets (does not overwrite non-zero). */
export function resolveRouteMetadataDefaults(
  packId: string,
  routeId: RouteId,
  _currencyMode: CityPackTransportCurrencyMode
): Pick<CityPackRouteContent, 'transit' | 'taxi'> {
  const seed = resolveCodeCityPackRouteSeed(packId, routeId);
  if (seed) {
    return {
      transit: { ...seed.transit },
      taxi: {
        priceKM: { ...seed.taxi.priceKM },
        priceEUR: { ...seed.taxi.priceEUR },
        durationMin: { ...seed.taxi.durationMin },
      },
    };
  }

  const genericByHub: Partial<
    Record<RouteId, Pick<CityPackRouteContent, 'transit' | 'taxi'>>
  > = {
    airport: {
      transit: { durationMin: 25 },
      taxi: {
        priceEUR: { min: 10, max: 20 },
        priceKM: { min: 10, max: 20 },
        durationMin: { min: 10, max: 25 },
      },
    },
    bus_central: {
      transit: { durationMin: 15 },
      taxi: {
        priceEUR: { min: 5, max: 10 },
        priceKM: { min: 5, max: 10 },
        durationMin: { min: 5, max: 12 },
      },
    },
    bus_istochno: {
      transit: { durationMin: 20 },
      taxi: {
        priceEUR: { min: 5, max: 12 },
        priceKM: { min: 5, max: 12 },
        durationMin: { min: 8, max: 15 },
      },
    },
    train_station: {
      transit: { durationMin: 20 },
      taxi: {
        priceEUR: { min: 8, max: 15 },
        priceKM: { min: 8, max: 15 },
        durationMin: { min: 8, max: 18 },
      },
    },
  };

  return (
    genericByHub[routeId] ?? {
      transit: { durationMin: 15 },
      taxi: {
        priceEUR: { min: 5, max: 15 },
        priceKM: { min: 5, max: 15 },
        durationMin: { min: 5, max: 15 },
      },
    }
  );
}

export function mergeRouteMetadataDefaults(
  packId: string,
  routeId: RouteId,
  route: CityPackRouteContent,
  currencyMode: CityPackTransportCurrencyMode
): CityPackRouteContent {
  const defaults = resolveRouteMetadataDefaults(packId, routeId, currencyMode);

  let transit = route.transit;
  if (isTransitDurationEmpty(transit) && defaults.transit.durationMin > 0) {
    transit = { ...transit, durationMin: defaults.transit.durationMin };
  }
  if (
    transit.stops == null &&
    defaults.transit.stops != null
  ) {
    transit = { ...transit, stops: defaults.transit.stops };
  }
  if (!transit.ticketPrice && defaults.transit.ticketPrice) {
    transit = { ...transit, ticketPrice: { ...defaults.transit.ticketPrice } };
  }

  let taxi = route.taxi;
  if (isTaxiMetadataEmpty(taxi)) {
    taxi = {
      priceKM: { ...defaults.taxi.priceKM },
      priceEUR: { ...defaults.taxi.priceEUR },
      durationMin: { ...defaults.taxi.durationMin },
    };
  }

  return { ...route, transit, taxi };
}
