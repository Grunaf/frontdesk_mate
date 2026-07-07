import { Bus, Plane, Train } from 'lucide-react';
import type { CategoryConfig, RouteCategory, RouteConfig, RouteId } from '@/entities/hostel';

const CATEGORY_ORDER: RouteCategory[] = ['airport', 'bus', 'train'];

const FALLBACK_HUB_CONFIG: Record<
  RouteCategory,
  Pick<CategoryConfig, 'icon' | 'labelKey'>
> = {
  airport: {
    icon: Plane,
    labelKey: 'pages.arrivalJourney.directions.hubs.airport',
  },
  bus: {
    icon: Bus,
    labelKey: 'pages.arrivalJourney.directions.hubs.bus',
  },
  train: {
    icon: Train,
    labelKey: 'pages.arrivalJourney.directions.hubs.train',
  },
};

/** Guest hub tabs derived from enabled routes (code pack categories + generic fallback). */
export function resolveGuestRouteCategories(
  packCategories: CategoryConfig[],
  enabledRoutes: RouteId[],
  routes: Partial<Record<RouteId, RouteConfig>>
): CategoryConfig[] {
  const activeRouteList = Object.values(routes).filter(
    (route): route is RouteConfig => route != null
  );

  if (activeRouteList.length === 0) {
    return [];
  }

  const categoriesWithRoutes = new Set(activeRouteList.map((route) => route.category));
  const resolved: CategoryConfig[] = [];

  for (const categoryId of CATEGORY_ORDER) {
    if (!categoriesWithRoutes.has(categoryId)) {
      continue;
    }

    const defaultRouteId = enabledRoutes.find(
      (routeId) => routes[routeId]?.category === categoryId
    );
    if (!defaultRouteId) {
      continue;
    }

    const codeCategory = packCategories.find((category) => category.id === categoryId);
    if (codeCategory) {
      resolved.push({ ...codeCategory, defaultRouteId });
      continue;
    }

    const fallback = FALLBACK_HUB_CONFIG[categoryId];
    resolved.push({
      id: categoryId,
      icon: fallback.icon,
      labelKey: fallback.labelKey,
      defaultRouteId,
    });
  }

  return resolved;
}
