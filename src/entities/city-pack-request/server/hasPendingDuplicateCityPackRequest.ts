import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/shared/lib/db/admin';

const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeCityNameKey(cityName: string): string {
  return cityName.trim().toLowerCase();
}

export async function hasPendingDuplicateCityPackRequest(
  userId: string,
  cityName: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return false;
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const targetKey = normalizeCityNameKey(cityName);

  const { data, error } = await admin
    .from('city_pack_requests')
    .select('city_name')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('created_at', since);

  if (error || !data) {
    return false;
  }

  return data.some((row) => normalizeCityNameKey(String(row.city_name ?? '')) === targetKey);
}
