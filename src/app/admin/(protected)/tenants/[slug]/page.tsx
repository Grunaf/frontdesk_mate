import { TenantForm } from '../TenantForm';
import { getCityPackForAdmin, getCityPackGateSnapshotForAdmin, listCityPacksForTenantSelect } from '@/entities/city-pack/server';
import type { CityPackContent } from '@/entities/city-pack';
import { getTenantRecord } from '@/entities/tenant/server';
import { isSupabaseAdminConfigured } from '@/shared/lib/db/admin';
import { buildSubscriptionDefaults } from '../sections/SubscriptionFields';

interface AdminTenantPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminTenantPage({ params, searchParams }: AdminTenantPageProps) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const isNew = slug === 'new';
  const tenant = isNew ? null : await getTenantRecord(slug);
  const adminWriteReady = isSupabaseAdminConfigured();
  const subscriptionDefaults = buildSubscriptionDefaults(tenant);
  const { options: cityPackOptions } = await listCityPacksForTenantSelect(tenant?.city_pack_id);
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{isNew ? 'New tenant' : `Edit: ${slug}`}</h2>
        {!isNew ? (
          <p className="text-sm text-muted-foreground">
            Settings, subscription, and guest access are managed from the command bar in the form.
          </p>
        ) : null}
      </div>

      {!adminWriteReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add <code className="text-xs">SUPABASE_SECRET_KEY</code> to <code className="text-xs">.env.local</code>{' '}
          (Supabase → Settings → API → Secret key, no <code className="text-xs">NEXT_PUBLIC_</code>) and restart{' '}
          <code className="text-xs">npm run dev</code> — otherwise Save will fail.
        </p>
      )}

      {saved === '1' && (
        <p className="sr-only" aria-live="polite">
          Tenant saved
        </p>
      )}

      {!isNew && !tenant && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tenant not found in database. You can create it with this slug below.
        </p>
      )}

      <TenantForm
        originalSlug={isNew ? '' : slug}
        justSaved={saved === '1'}
        cityPackOptions={cityPackOptions}
        cityPackGateSnapshot={cityPackGateSnapshot}
        cityPackContentsById={cityPackContentsById}
        initial={{
          slug: tenant?.slug ?? (isNew ? '' : slug),
          name: tenant?.name ?? '',
          cityPackId: tenant?.city_pack_id ?? 'sarajevo',
          settings: tenant?.settings,
          ...subscriptionDefaults,
        }}
      />
    </div>
  );
}
