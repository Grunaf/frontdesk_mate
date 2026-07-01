import { listPublicTenants } from '@/entities/tenant/server';
import type { TenantPublicSite } from '@/shared/config';
import { TenantNotFoundContent } from '@/views/platform/ui/TenantNotFoundContent';

interface TenantNotFoundViewProps {
  site: TenantPublicSite;
  locale: string;
}

export async function TenantNotFoundView({ site, locale }: TenantNotFoundViewProps) {
  const activeTenants = await listPublicTenants();

  return (
    <TenantNotFoundContent site={site} locale={locale} activeTenants={activeTenants} />
  );
}
