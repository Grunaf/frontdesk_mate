import { Plane, Bus } from 'lucide-react';
import type { CategoryConfig, CityPackContentKeys, RouteConfig, RouteId } from '../routes';
import { cityPackRoutesNamespace } from './locale';

const K = cityPackRoutesNamespace('kotor');

export const KOTOR_CONTENT_KEYS: CityPackContentKeys = {
  taxiStandWarning: `${K}.taxiService.standWarning`,
  taxiMeterWarning: `${K}.taxiService.meterWarning`,
};

export const KOTOR_ROUTE_CATEGORIES: CategoryConfig[] = [
  {
    id: 'airport',
    icon: Plane,
    labelKey: `${K}.from.airport`,
    defaultRouteId: 'airport',
  },
  {
    id: 'bus',
    icon: Bus,
    labelKey: `${K}.from.busStation`,
    defaultRouteId: 'bus_central',
  },
];

export const KOTOR_ROUTES = {
  airport: {
    id: 'airport',
    category: 'airport',
    titleKey: `${K}.from.airport`,
    locationKey: `${K}.airport.locationGenitive`,
    translationKeys: {
      taxiCost: `${K}.airport.taxi.costEstimation`,
      taxiPickupPoint: `${K}.airport.taxi.pickupPoint`,
      publicTitle: `${K}.airport.public.title`,
      publicSummary: `${K}.airport.public.summary`,
      publicPreview: `${K}.airport.public.walkToStop`,
      publicText: `${K}.airport.public.text`,
      publicGetOffAt: `${K}.airport.public.getOffAt`,
      publicWalkToHostel: `${K}.airport.public.walkToHostel`,
    },
    metadata: {
      taxiPriceKM: { min: 20, max: 35 },
      taxiPriceEUR: { min: 20, max: 35 },
      taxiDurationMin: { min: 15, max: 25 },
      publicTransport: {
        durationMin: 40,
        fareLabelKey: `${K}.airport.public.fareLabel`,
        officialRouteUrl: 'https://www.autobusni-kolodvor.com/en/bus-tivat-kotor-timetable',
      },
    },
  },
  bus_central: {
    id: 'bus_central',
    category: 'bus',
    routeMode: 'walk_only',
    titleKey: `${K}.from.busMain`,
    locationKey: `${K}.busMain.locationGenitive`,
    translationKeys: {
      taxiCost: `${K}.busMain.taxi.costEstimation`,
      taxiPickupPoint: `${K}.busMain.taxi.pickupPoint`,
      publicTitle: `${K}.busMain.public.title`,
      publicSummary: `${K}.busMain.public.summary`,
      publicPreview: `${K}.busMain.public.walkToStop`,
      publicText: `${K}.busMain.public.text`,
      publicGetOffAt: `${K}.busMain.public.getOffAt`,
      publicWalkToHostel: `${K}.busMain.public.walkToHostel`,
    },
    metadata: {
      taxiPriceKM: { min: 5, max: 10 },
      taxiPriceEUR: { min: 5, max: 10 },
      taxiDurationMin: { min: 5, max: 12 },
      publicTransport: {
        durationMin: 15,
        fareLabelKey: `${K}.busMain.public.fareLabel`,
      },
    },
  },
} satisfies Partial<Record<RouteId, RouteConfig>>;
