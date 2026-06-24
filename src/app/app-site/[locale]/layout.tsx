import { TenantProvider } from '@/entities/tenant';
import { listPublicTenants, resolveTenantAccess } from '@/entities/tenant/server';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { GuestAppRuntime } from '@/entities/tenant/ui/GuestAppRuntime';
import { TenantOfflineContent } from '@/views/platform/ui/TenantOfflineContent';
import { AnalyticsProvider } from '@/shared/lib/analytics';
import { BaseHeader } from '@/shared/ui';
import { getRouteTranslations } from '@/shared/lib/getRouteTranslations';
import { notFound } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params;
  const translatedTitles = await getRouteTranslations('app');
  const access = await resolveTenantAccess('app');

  if (access.kind === 'missing') {
    notFound();
  }

  if (access.kind === 'offline') {
    const activeTenants = await listPublicTenants();

    return (
      <TenantOfflineContent
        shell={access.shell}
        site="app"
        locale={locale}
        activeTenants={activeTenants}
      />
    );
  }

  const tenant = access.config;
  const tenantSlug = tenant.slug;
  const session = await resolveGuestSessionFromCookies(tenantSlug);

  return (
    <TenantProvider config={tenant}>
      <AnalyticsProvider tenantSlug={tenantSlug} site="app">
        <GuestAppRuntime
          session={session}
          currentTenantSlug={tenantSlug}
          sessionBedId={session?.bedId ?? null}
        >
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
            <BaseHeader translatedTitles={translatedTitles} />
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </GuestAppRuntime>
      </AnalyticsProvider>
    </TenantProvider>
  );
}
