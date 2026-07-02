import { getLocale } from 'next-intl/server';
import { TenantNotFoundView } from '@/views/platform/ui/TenantNotFoundView';

export default async function LandingTenantNotFound() {
  const locale = await getLocale();

  return <TenantNotFoundView site="landing" locale={locale} />;
}
