import { Suspense } from 'react';
import { getCityPackForAdmin, getCityPackGateSnapshotForAdmin, listCityPacksForTenantSelect } from '@/entities/city-pack/server';
import type { CityPackContent } from '@/entities/city-pack';
import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { getTenantRecord } from '@/entities/tenant/server';
import { OwnerSettingsCoordinator } from '@/features/owner-settings';
import { buildSubscriptionDefaults } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { redirect } from 'next/navigation';

interface OwnerSettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OwnerSettingsLayout({ children, params }: OwnerSettingsLayoutProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const tenant = await getTenantRecord(context.slug);
  if (!tenant) {
    redirect(`/${locale}/onboarding`);
  }

  const subscriptionDefaults = buildSubscriptionDefaults(tenant);
  const { options: cityPackOptions } = await listCityPacksForTenantSelect(tenant.city_pack_id);
  const { snapshot: cityPackGateSnapshot } = await getCityPackGateSnapshotForAdmin();
  const cityPackContentsById: Record<string, CityPackContent> = {};
  const packIds = [...new Set(cityPackOptions.map((option) => option.id))];
  await Promise.all(
    packIds.map(async (packId) => {
      const { pack } = await getCityPackForAdmin(packId);
      cityPackContentsById[packId] = pack?.content ?? {};
    })
  );

  return (
    <>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings…</p>}>
        <OwnerSettingsCoordinator
          locale={locale}
          lifecycleStatus={context.lifecycleStatus}
          cityPackOptions={cityPackOptions}
          cityPackGateSnapshot={cityPackGateSnapshot}
          cityPackContentsById={cityPackContentsById}
          initial={{
            slug: tenant.slug,
            name: tenant.name,
            cityPackId: tenant.city_pack_id,
            settings: tenant.settings,
            ...subscriptionDefaults,
          }}
        />
      </Suspense>
      {children}
    </>
  );
}
