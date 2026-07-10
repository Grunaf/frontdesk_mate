import { SITE_CONFIG } from '@/shared/config';

export function resolveGuestRegistrationPath(input: { locale: string }): string {
  return `/${input.locale}${SITE_CONFIG.routes.app.registration.path}`;
}
