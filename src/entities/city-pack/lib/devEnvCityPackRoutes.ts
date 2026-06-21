import type { CityPackId, RouteId } from '@/entities/hostel';

/** Dev-only enabled routes when Supabase is not configured (matches migration 021 seeds). */
const DEV_ENV_ENABLED_ROUTES: Partial<Record<CityPackId, RouteId[]>> = {
  sarajevo: ['airport', 'bus_central', 'train_station'],
  kotor: ['airport', 'bus_central'],
};

export function getDevEnvCityPackEnabledRoutes(cityPackId: CityPackId): RouteId[] {
  return DEV_ENV_ENABLED_ROUTES[cityPackId] ?? [];
}
