import 'server-only';

export {
  getCityPackContentForRuntime,
  getCityPackForAdmin,
  getCityPackGateSnapshotForAdmin,
  listCityPacksForAdmin,
  listCityPacksForTenantSelect,
  upsertCityPack,
} from './api/cityPackRepository';

import type { CityPackSelectOption } from './model/types';
import { listCityPacksForTenantSelect } from './api/cityPackRepository';

export async function listCityPacksForOwnerOnboarding(): Promise<{
  packs: CityPackSelectOption[];
  error: string | null;
}> {
  const { options, error } = await listCityPacksForTenantSelect();
  if (error) {
    return { packs: [], error };
  }

  const packs = options.filter((pack) => pack.readyForTenants && !pack.notReadyReason);
  return { packs, error: null };
}
