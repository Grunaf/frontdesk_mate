import type { CityPackRouteContent, CityPackTransportCurrencyMode } from '../model/types';
import { autofillTaxiCostFromMetadata } from './autofillTaxiCostFromMetadata';
import { normalizeRouteTaxiForCurrency } from './normalizeRouteTaxiForCurrency';

export interface RouteMetadataImport {
  transitDurationMin?: number;
  transitStops?: number;
  ticketKioskKm?: number;
  ticketDriverKm?: number;
  taxiEurMin?: number;
  taxiEurMax?: number;
  taxiKmMin?: number;
  taxiKmMax?: number;
  taxiDurationMin?: number;
  taxiDurationMax?: number;
}

function positive(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function patchRouteMetadataFromImport(
  route: CityPackRouteContent,
  metadata: RouteMetadataImport | undefined,
  currencyMode: CityPackTransportCurrencyMode
): CityPackRouteContent {
  if (!metadata) {
    return route;
  }

  let next = { ...route, transit: { ...route.transit }, taxi: { ...route.taxi } };

  const transitDuration = positive(metadata.transitDurationMin);
  if (transitDuration) {
    next.transit.durationMin = transitDuration;
  }

  const stops = positive(metadata.transitStops);
  if (stops) {
    next.transit.stops = stops;
  }

  const kiosk = positive(metadata.ticketKioskKm);
  const driver = positive(metadata.ticketDriverKm);
  if (kiosk || driver) {
    next.transit.ticketPrice = {
      kioskKM: kiosk ?? next.transit.ticketPrice?.kioskKM ?? 0,
      driverKM: driver ?? next.transit.ticketPrice?.driverKM ?? 0,
    };
  }

  const eurMin = positive(metadata.taxiEurMin);
  const eurMax = positive(metadata.taxiEurMax);
  if (eurMin != null || eurMax != null) {
    next.taxi.priceEUR = {
      min: eurMin ?? next.taxi.priceEUR.min,
      max: eurMax ?? next.taxi.priceEUR.max,
    };
  }

  const kmMin = positive(metadata.taxiKmMin);
  const kmMax = positive(metadata.taxiKmMax);
  if (kmMin != null || kmMax != null) {
    next.taxi.priceKM = {
      min: kmMin ?? next.taxi.priceKM.min,
      max: kmMax ?? next.taxi.priceKM.max,
    };
  }

  const taxiDurMin = positive(metadata.taxiDurationMin);
  const taxiDurMax = positive(metadata.taxiDurationMax);
  if (taxiDurMin != null || taxiDurMax != null) {
    next.taxi.durationMin = {
      min: taxiDurMin ?? next.taxi.durationMin.min,
      max: taxiDurMax ?? next.taxi.durationMin.max,
    };
  }

  next = normalizeRouteTaxiForCurrency(next, currencyMode);
  next = autofillTaxiCostFromMetadata(next, currencyMode);
  return next;
}
