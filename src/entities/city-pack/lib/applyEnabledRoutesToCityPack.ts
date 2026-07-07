import type { CityPack, RouteConfig, RouteId } from '@/entities/hostel';
import { resolveGuestRouteCategories } from './resolveGuestRouteCategories';

export function applyEnabledRoutesToCityPack(
  pack: CityPack,
  enabledRoutes: RouteId[]
): CityPack {
  if (enabledRoutes.length === 0) {
    return { ...pack, routes: {}, categories: [] };
  }

  const routes: Partial<Record<RouteId, RouteConfig>> = {};

  for (const routeId of enabledRoutes) {
    const route = pack.routes[routeId];
    if (route) {
      routes[routeId] = route;
    }
  }

  const categories = resolveGuestRouteCategories(pack.categories, enabledRoutes, routes);

  return {
    ...pack,
    routes,
    categories,
  };
}
