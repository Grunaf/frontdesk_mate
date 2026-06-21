import type { CategoryConfig, CityPack, RouteConfig, RouteId } from '@/entities/hostel';

export function applyEnabledRoutesToCityPack(
  pack: CityPack,
  enabledRoutes: RouteId[]
): CityPack {
  if (enabledRoutes.length === 0) {
    return { ...pack, routes: {}, categories: [] };
  }

  const enabledSet = new Set<RouteId>(enabledRoutes);
  const routes: Partial<Record<RouteId, RouteConfig>> = {};

  for (const routeId of enabledRoutes) {
    const route = pack.routes[routeId];
    if (route) {
      routes[routeId] = route;
    }
  }

  const activeRouteList = Object.values(routes).filter(
    (route): route is RouteConfig => route != null
  );
  const activeCategories = pack.categories.filter((category) =>
    activeRouteList.some((route) => route.category === category.id)
  );

  return {
    ...pack,
    routes,
    categories: activeCategories,
  };
}
