import { getCityPackForAdmin, getCityPackGateSnapshotForAdmin, listCityPacksForTenantSelect } from '@/entities/city-pack/server';
import type { CityPackContent } from '@/entities/city-pack';
import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { getTenantRecord } from '@/entities/tenant/server';
import { OwnerSettingsCoordinator } from '@/features/owner-settings';
import { buildSubscriptionDefaults } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { redirect } from 'next/navigation';

interface OwnerSettingsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function OwnerSettingsPage({ params, searchParams }: OwnerSettingsPageProps) {
  const { locale } = await params;
  const { saved } = await searchParams;
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
    <OwnerSettingsCoordinator
      locale={locale}
      lifecycleStatus={context.lifecycleStatus}
      justSaved={saved === '1'}
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
  );
}
