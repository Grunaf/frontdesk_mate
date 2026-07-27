'use server';

import { searchGuests, type GuestProfile } from '@/entities/guest/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';

export type SearchGuestProfilesForTourismActionResult =
  | { ok: true; items: GuestProfile[] }
  | { ok: false; error: 'unauthorized' | 'db_unavailable' | 'unknown' };

/** Reception typeahead for tourism identity form (tenant guests). */
export async function searchGuestProfilesForTourismAction(input: {
  tenantSlug: string;
  query: string;
}): Promise<SearchGuestProfilesForTourismActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) {
      return { ok: false, error: 'db_unavailable' };
    }
    const result = await searchGuests({
      tenantId: tenant.id,
      query: input.query,
    });
    if (!result.ok) {
      return { ok: false, error: 'db_unavailable' };
    }
    return { ok: true, items: result.items };
  } catch (error) {
    console.error('searchGuestProfilesForTourismAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
