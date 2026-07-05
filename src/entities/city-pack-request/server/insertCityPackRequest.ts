import type { InsertCityPackRequestInput } from '../model/types';
import { createOwnerServerClient, isOwnerSupabaseConfigured } from '@/shared/lib/db/supabase-owner-server';

export type InsertCityPackRequestResult =
  | { ok: true }
  | { ok: false; code: 'insert_failed' | 'not_configured' };

export async function insertCityPackRequest(
  input: InsertCityPackRequestInput
): Promise<InsertCityPackRequestResult> {
  if (!isOwnerSupabaseConfigured()) {
    return { ok: false, code: 'not_configured' };
  }

  const supabase = await createOwnerServerClient();
  const { error } = await supabase.from('city_pack_requests').insert({
    user_id: input.userId,
    tenant_id: input.tenantId,
    kind: input.kind,
    city_name: input.cityName,
    country_or_region: input.countryOrRegion,
    message: input.message,
    related_city_pack_id: input.relatedCityPackId,
  });

  if (error) {
    return { ok: false, code: 'insert_failed' };
  }

  return { ok: true };
}
