import type { RouteCategory } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant/model/settings';
import { isHubCategory } from './isHubCategory';

export function resolveHubTransferEnabled(
  settings: Pick<TenantSettings, 'hubTransfer'> | undefined,
  hubCategory: RouteCategory
): boolean {
  if (!isHubCategory(hubCategory)) {
    return false;
  }

  const enabled = settings?.hubTransfer?.enabledHubCategories;
  if (!enabled?.length) {
    return false;
  }

  return enabled.includes(hubCategory);
}
