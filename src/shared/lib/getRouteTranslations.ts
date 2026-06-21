import { getTranslations } from 'next-intl/server';
import { SITE_CONFIG } from '@/shared/config';

type SubdomainType = keyof typeof SITE_CONFIG.routes;

export async function getRouteTranslations(subdomain: SubdomainType) {
  const navigationT = await getTranslations('pages.navigation');

  const routes = Object.values(SITE_CONFIG.routes[subdomain]);

  return routes.reduce(
    (acc, route) => {
      acc[route.path] = navigationT(route.titleKey);
      return acc;
    },
    {} as Record<string, string>
  );
}
