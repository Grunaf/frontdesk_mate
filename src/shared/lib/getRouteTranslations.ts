import { getTranslations } from 'next-intl/server';
import { SITE_CONFIG } from '@/shared/config';

type SubdomainType = keyof typeof SITE_CONFIG.routes;

export async function getRouteTranslations(subdomain: SubdomainType) {
  const navigationT = await getTranslations('pages.navigation');
  const staySetupT =
    subdomain === 'app' ? await getTranslations('pages.staySetup') : null;
  const registrationPath = SITE_CONFIG.routes.app.registration.path;

  const routes = Object.values(SITE_CONFIG.routes[subdomain]);

  return routes.reduce(
    (acc, route) => {
      if (staySetupT && route.path === registrationPath) {
        acc[route.path] = staySetupT('tabs.registration');
        return acc;
      }
      acc[route.path] = navigationT(route.titleKey);
      return acc;
    },
    {} as Record<string, string>
  );
}
