import { getCityPackForAdmin, getCityPackGateSnapshotForAdmin, listCityPacksForTenantSelect } from '@/entities/city-pack/server';
import type { CityPackContent } from '@/entities/city-pack';
import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { getTenantRecord } from '@/entities/tenant/server';
import { OwnerSetupWizardCoordinator } from '@/features/owner-setup';
import { buildSubscriptionDefaults } from '@/app/admin/(protected)/tenants/sections/SubscriptionFields';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface OwnerSetupPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function OwnerSetupPage({ params, searchParams }: OwnerSetupPageProps) {
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

  const t = await getTranslations('pages.owner.setup');
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{context.name}</span> · {t('slugLabel')}{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{context.slug}</code>
        </p>
      </div>

      {saved === '1' ? (
        <p className="sr-only" aria-live="polite">
          {t('savedLive')}
        </p>
      ) : null}

      <OwnerSetupWizardCoordinator
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
    </div>
  );
}
