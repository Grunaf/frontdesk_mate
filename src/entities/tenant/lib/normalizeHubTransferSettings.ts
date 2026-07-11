import { isHubCategory } from '@/entities/guest-hub-transfer/lib/isHubCategory';
import type { RouteCategory } from '@/entities/hostel';
import type { TenantSettings } from '../model/settings';

export function normalizeHubTransferForSave(
  input: { enabledHubCategories?: unknown } | undefined | null
): TenantSettings['hubTransfer'] {
  if (!input || typeof input !== 'object') {
    return { enabledHubCategories: [] };
  }

  const raw = input.enabledHubCategories;
  if (!Array.isArray(raw)) {
    return { enabledHubCategories: [] };
  }

  const seen = new Set<string>();
  const enabledHubCategories: RouteCategory[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') {
      continue;
    }
    const category = item.trim();
    if (!isHubCategory(category) || seen.has(category)) {
      continue;
    }
    seen.add(category);
    enabledHubCategories.push(category);
  }

  return { enabledHubCategories };
}
