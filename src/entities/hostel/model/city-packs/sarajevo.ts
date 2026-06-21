import { Plane, Bus, Train } from 'lucide-react';
import type { CategoryConfig, CityPackContentKeys, RouteConfig, RouteId } from '../routes';
import { cityPackRoutesNamespace } from './locale';

const K = cityPackRoutesNamespace('sarajevo');

export const SARAJEVO_CONTENT_KEYS: CityPackContentKeys = {
  taxiStandWarning: `${K}.taxiService.standWarning`,
  taxiMeterWarning: `${K}.taxiService.meterWarning`,
  busClarificationQuestion: `${K}.bus.clarificationQuestion`,
};

export const SARAJEVO_ROUTE_CATEGORIES: CategoryConfig[] = [
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
  {
    id: 'train',
    icon: Train,
    labelKey: `${K}.from.train`,
    defaultRouteId: 'train_station',
  },
];

export const SARAJEVO_ROUTES: Record<RouteId, RouteConfig> = {
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
      taxiPriceKM: { min: 15, max: 20 },
      taxiPriceEUR: { min: 7, max: 10 },
      taxiDurationMin: { min: 15, max: 25 },
      publicTransport: {
        stops: 15,
        durationMin: 27,
        ticketPrice: { kioskKM: 1.8, driverKM: 2.0 },
        officialRouteUrl: 'https://gras.ba/redovi-voznje/',
      },
    },
  },
  bus_central: {
    id: 'bus_central',
    category: 'bus',
    titleKey: `${K}.from.busMain`,
    hintKey: `${K}.bus.centralHint`,
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
      taxiPriceKM: { min: 7, max: 10 },
      taxiPriceEUR: { min: 3, max: 5 },
      taxiDurationMin: { min: 5, max: 10 },
      publicTransport: {
        stops: 4,
        durationMin: 9,
        ticketPrice: { kioskKM: 1.8, driverKM: 2.0 },
        officialRouteUrl: 'https://gras.ba/redovi-voznje/',
      },
    },
  },
  bus_istochno: {
    id: 'bus_istochno',
    category: 'bus',
    titleKey: `${K}.from.busIstochno`,
    hintKey: `${K}.bus.istochnoHint`,
    locationKey: `${K}.busIstochno.locationGenitive`,
    translationKeys: {
      taxiCost: `${K}.busIstochno.taxi.costEstimation`,
      taxiPickupPoint: `${K}.busIstochno.taxi.pickupPoint`,
      publicTitle: `${K}.busIstochno.public.title`,
      publicSummary: `${K}.busIstochno.public.summary`,
      publicPreview: `${K}.busIstochno.public.walkToStop`,
      publicText: `${K}.busIstochno.public.text`,
      publicGetOffAt: `${K}.busIstochno.public.getOffAt`,
      publicWalkToHostel: `${K}.busIstochno.public.walkToHostel`,
    },
    metadata: {
      taxiPriceKM: { min: 15, max: 20 },
      taxiPriceEUR: { min: 7, max: 10 },
      taxiDurationMin: { min: 20, max: 30 },
      publicTransport: {
        stops: 17,
        durationMin: 30,
        ticketPrice: { kioskKM: 1.8, driverKM: 2.0 },
        officialRouteUrl: 'https://gras.ba/redovi-voznje/',
      },
    },
  },
  train_station: {
    id: 'train_station',
    category: 'train',
    titleKey: `${K}.from.train`,
    locationKey: `${K}.train.locationGenitive`,
    translationKeys: {
      publicTitle: `${K}.train.public.title`,
      publicSummary: `${K}.train.public.summary`,
      publicPreview: `${K}.train.public.walkToStop`,
      publicText: `${K}.train.public.text`,
      publicGetOffAt: `${K}.train.public.getOffAt`,
      publicWalkToHostel: `${K}.train.public.walkToHostel`,
      taxiCost: `${K}.train.taxi.costEstimation`,
      taxiPickupPoint: `${K}.train.taxi.pickupPoint`,
    },
    metadata: {
      taxiPriceKM: { min: 7, max: 10 },
      taxiPriceEUR: { min: 3, max: 5 },
      taxiDurationMin: { min: 5, max: 10 },
      publicTransport: {
        stops: 4,
        durationMin: 9,
        ticketPrice: { kioskKM: 1.8, driverKM: 2.0 },
        officialRouteUrl: 'https://gras.ba/redovi-voznje/',
      },
    },
  },
};
