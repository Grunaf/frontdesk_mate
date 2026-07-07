import type { RouteId } from '@/entities/hostel';

export const MIN_PLACES_FOR_PACK = 5;

/** Max optional tips per arrival hub (guest «Good to know»). */
export const MAX_ROUTE_TIPS = 5;

export const CITY_PACK_WIZARD_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'places', label: 'Places' },
  { id: 'city-settings', label: 'City settings' },
  { id: 'routes', label: 'Arrival' },
  { id: 'preview', label: 'Publish' },
] as const;

export const ROUTE_PRESETS: { id: RouteId; label: string }[] = [
  { id: 'airport', label: 'Airport' },
  { id: 'bus_central', label: 'Bus station' },
  { id: 'bus_istochno', label: 'Secondary bus hub' },
  { id: 'train_station', label: 'Train station' },
];
