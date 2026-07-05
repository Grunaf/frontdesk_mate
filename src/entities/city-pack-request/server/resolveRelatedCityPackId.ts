import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/shared/lib/db/admin';

export async function resolveRelatedCityPackId(packQuery: string): Promise<string | null> {
  const id = packQuery.trim();
  if (!id) {
    return null;
  }

  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.from('city_packs').select('id').eq('id', id).maybeSingle();
  if (error || !data?.id) {
    return null;
  }

  return data.id;
}
