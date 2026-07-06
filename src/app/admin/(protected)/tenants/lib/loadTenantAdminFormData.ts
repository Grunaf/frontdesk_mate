import {
  getCityPackForAdmin,
  getCityPackGateSnapshotForAdmin,
  listCityPacksForTenantSelect,
} from '@/entities/city-pack/server';
import type { CityPackContent } from '@/entities/city-pack';
import { getTenantRecord } from '@/entities/tenant/server';
import { buildSubscriptionDefaults } from '../sections/SubscriptionFields';

export async function loadTenantAdminFormData(slug: string) {
  const isNew = slug === 'new';
  const tenant = isNew ? null : await getTenantRecord(slug);
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

  return {
    isNew,
    tenant,
    cityPackOptions,
    cityPackGateSnapshot,
    cityPackContentsById,
    initial: {
      slug: tenant?.slug ?? (isNew ? '' : slug),
      name: tenant?.name ?? '',
      cityPackId: tenant?.city_pack_id ?? 'sarajevo',
      settings: tenant?.settings,
      ...subscriptionDefaults,
    },
  };
}
