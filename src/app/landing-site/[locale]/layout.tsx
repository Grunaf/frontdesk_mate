import { TenantProvider } from '@/entities/tenant';
import { listPublicTenants, resolveTenantAccess } from '@/entities/tenant/server';
import { TenantOfflineContent } from '@/views/platform/ui/TenantOfflineContent';
import { LandingSubscriptionNotice } from '@/views/landing/ui/LandingSubscriptionNotice';
import { LandingSiteHeader } from '@/views/landing/ui/LandingSiteHeader';
import { LandingPostWhatsappBanner } from '@/views/landing/ui/LandingPostWhatsappBanner';
import { AnalyticsProvider, LandingViewTracker } from '@/shared/lib/analytics';
import { getRouteTranslations } from '@/shared/lib/getRouteTranslations';
import { notFound } from 'next/navigation';

interface LandingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LandingLayout({ children, params }: LandingLayoutProps) {
  const { locale } = await params;
  await getRouteTranslations('landing');
  const access = await resolveTenantAccess('landing');

  if (access.kind === 'missing') {
    notFound();
  }

  if (access.kind === 'offline') {
    const activeTenants = await listPublicTenants();

    return (
      <TenantOfflineContent
        shell={access.shell}
        site="landing"
        locale={locale}
        activeTenants={activeTenants}
      />
    );
  }

  const tenantSlug = access.config.slug;

  return (
    <TenantProvider config={access.config}>
      <AnalyticsProvider tenantSlug={tenantSlug} site="landing">
        <LandingViewTracker tenantSlug={tenantSlug} />
        <div className="mx-auto flex w-full flex-col bg-transparent">
          <LandingSubscriptionNotice />
          <LandingSiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <LandingPostWhatsappBanner />
        </div>
      </AnalyticsProvider>
    </TenantProvider>
  );
}
