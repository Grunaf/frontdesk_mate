import { Plane, Bus, Train, LucideIcon } from 'lucide-react';

export type RouteCategory = 'airport' | 'bus' | 'train';
export type RouteId = 'airport' | 'bus_central' | 'bus_istochno' | 'train_station';

/** Public-transit metadata. Omit stops/ticketPrice/officialRouteUrl when not applicable. */
export interface PublicTransportConfig {
  durationMin: number;
  stops?: number;
  ticketPrice?: {
    kioskKM: number;
    driverKM: number;
  };
  /** Full i18n key for a custom fare chip (e.g. free transit, shuttle flat fare). */
  fareLabelKey?: string;
  officialRouteUrl?: string;
}

export function hasOfficialRouteSchedule(route: RouteConfig): boolean {
  return Boolean(route.metadata.publicTransport.officialRouteUrl);
}

export interface CategoryConfig {
  id: RouteCategory;
  icon: LucideIcon;
  labelKey: string;
  defaultRouteId: RouteId;
}

export interface RouteConfig {
  id: RouteId;
  category: RouteCategory;
  titleKey: string;
  hintKey?: string;
  locationKey: string;
  translationKeys: {
    publicTitle: string;
    publicSummary: string;
    publicPreview: string;
    publicText: string;
    publicGetOffAt: string;
    publicWalkToHostel: string;
    taxiCost: string;
    taxiPickupPoint: string;
  };
  metadata: {
    taxiPriceKM: { min: number; max: number };
    taxiPriceEUR: { min: number; max: number };
    taxiDurationMin: { min: number; max: number };
    publicTransport: PublicTransportConfig;
  };
}

export const ROUTE_CATEGORIES: CategoryConfig[] = [
  {
    id: 'airport',
    icon: Plane,
    labelKey: 'domains.hostel.routes.from.airport',
    defaultRouteId: 'airport',
  },
  {
    id: 'bus',
    icon: Bus,
    labelKey: 'domains.hostel.routes.from.busStation',
    defaultRouteId: 'bus_central',
  },
  {
    id: 'train',
    icon: Train,
    labelKey: 'domains.hostel.routes.from.train',
    defaultRouteId: 'train_station',
  },
];

/**
 * Per-deploy route catalog. White-label: swap this config and matching i18n per city.
 * Add a second RouteId in the same category (e.g. airport_shuttle) for shuttle alternatives.
 */
export const ARRIVAL_ROUTES_CONFIG: Record<RouteId, RouteConfig> = {
  airport: {
    id: 'airport',
    category: 'airport',
    titleKey: 'domains.hostel.routes.from.airport',
    locationKey: 'domains.hostel.routes.airport.locationGenitive',
    translationKeys: {
      taxiCost: 'domains.hostel.routes.airport.taxi.costEstimation',
      taxiPickupPoint: 'domains.hostel.routes.airport.taxi.pickupPoint',
      publicTitle: 'domains.hostel.routes.airport.public.title',
      publicSummary: 'domains.hostel.routes.airport.public.summary',
      publicPreview: 'domains.hostel.routes.airport.public.walkToStop',
      publicText: 'domains.hostel.routes.airport.public.text',
      publicGetOffAt: 'domains.hostel.routes.airport.public.getOffAt',
      publicWalkToHostel: 'domains.hostel.routes.airport.public.walkToHostel',
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
    titleKey: 'domains.hostel.routes.from.busMain',
    hintKey: 'domains.hostel.routes.bus.centralHint',
    locationKey: 'domains.hostel.routes.busMain.locationGenitive',
    translationKeys: {
      taxiCost: 'domains.hostel.routes.busMain.taxi.costEstimation',
      taxiPickupPoint: 'domains.hostel.routes.busMain.taxi.pickupPoint',
      publicTitle: 'domains.hostel.routes.busMain.public.title',
      publicSummary: 'domains.hostel.routes.busMain.public.summary',
      publicPreview: 'domains.hostel.routes.busMain.public.walkToStop',
      publicText: 'domains.hostel.routes.busMain.public.text',
      publicGetOffAt: 'domains.hostel.routes.busMain.public.getOffAt',
      publicWalkToHostel: 'domains.hostel.routes.busMain.public.walkToHostel',
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
    titleKey: 'domains.hostel.routes.from.busIstochno',
    hintKey: 'domains.hostel.routes.bus.istochnoHint',
    locationKey: 'domains.hostel.routes.busIstochno.locationGenitive',
    translationKeys: {
      taxiCost: 'domains.hostel.routes.busIstochno.taxi.costEstimation',
      taxiPickupPoint: 'domains.hostel.routes.busIstochno.taxi.pickupPoint',
      publicTitle: 'domains.hostel.routes.busIstochno.public.title',
      publicSummary: 'domains.hostel.routes.busIstochno.public.summary',
      publicPreview: 'domains.hostel.routes.busIstochno.public.walkToStop',
      publicText: 'domains.hostel.routes.busIstochno.public.text',
      publicGetOffAt: 'domains.hostel.routes.busIstochno.public.getOffAt',
      publicWalkToHostel: 'domains.hostel.routes.busIstochno.public.walkToHostel',
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
    titleKey: 'domains.hostel.routes.from.train',
    locationKey: 'domains.hostel.routes.train.locationGenitive',
    translationKeys: {
      publicTitle: 'domains.hostel.routes.train.public.title',
      publicSummary: 'domains.hostel.routes.train.public.summary',
      publicPreview: 'domains.hostel.routes.train.public.walkToStop',
      publicText: 'domains.hostel.routes.train.public.text',
      publicGetOffAt: 'domains.hostel.routes.train.public.getOffAt',
      publicWalkToHostel: 'domains.hostel.routes.train.public.walkToHostel',
      taxiCost: 'domains.hostel.routes.train.taxi.costEstimation',
      taxiPickupPoint: 'domains.hostel.routes.train.taxi.pickupPoint',
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
