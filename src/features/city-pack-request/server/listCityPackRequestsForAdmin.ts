import 'server-only';

import type { CityPackRequestKind, CityPackRequestStatus } from '@/entities/city-pack-request';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';

const LIST_LIMIT = 50;

export type CityPackRequestAdminRow = {
  id: string;
  userId: string;
  contactEmail: string | null;
  kind: CityPackRequestKind;
  cityName: string;
  countryOrRegion: string | null;
  message: string | null;
  relatedCityPackId: string | null;
  status: CityPackRequestStatus;
  createdAt: string;
  tenantSlug: string | null;
  tenantName: string | null;
};

export type CityPackRequestAdminFilter = 'pending' | 'all' | 'fulfilled' | 'dismissed';

type DbRow = {
  id: string;
  user_id: string;
  kind: CityPackRequestKind;
  city_name: string;
  country_or_region: string | null;
  message: string | null;
  related_city_pack_id: string | null;
  status: CityPackRequestStatus;
  created_at: string;
  tenant: { slug: string; name: string } | { slug: string; name: string }[] | null;
};

function sortRequests(rows: CityPackRequestAdminRow[]): CityPackRequestAdminRow[] {
  return [...rows].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1;
    const bPending = b.status === 'pending' ? 0 : 1;
    if (aPending !== bPending) {
      return aPending - bPending;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function resolveContactEmails(userIds: string[]): Promise<Map<string, string | null>> {
  const admin = getSupabaseAdmin();
  const map = new Map<string, string | null>();
  if (!admin || userIds.length === 0) {
    return map;
  }

  await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data.user) {
        map.set(userId, null);
        return;
      }
      map.set(userId, data.user.email ?? null);
    })
  );

  return map;
}

function normalizeTenant(
  tenant: DbRow['tenant']
): { slug: string; name: string } | null {
  if (!tenant) {
    return null;
  }
  if (Array.isArray(tenant)) {
    return tenant[0] ?? null;
  }
  return tenant;
}

function mapRow(row: DbRow, emailByUserId: Map<string, string | null>): CityPackRequestAdminRow {
  const tenant = normalizeTenant(row.tenant);
  return {
    id: row.id,
    userId: row.user_id,
    contactEmail: emailByUserId.get(row.user_id) ?? null,
    kind: row.kind,
    cityName: row.city_name,
    countryOrRegion: row.country_or_region,
    message: row.message,
    relatedCityPackId: row.related_city_pack_id,
    status: row.status,
    createdAt: row.created_at,
    tenantSlug: tenant?.slug ?? null,
    tenantName: tenant?.name ?? null,
  };
}

export async function listCityPackRequestsForAdmin(filter: CityPackRequestAdminFilter): Promise<{
  rows: CityPackRequestAdminRow[];
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { rows: [], error: 'Supabase admin not configured.' };
  }

  let query = admin
    .from('city_pack_requests')
    .select(
      `
      id,
      user_id,
      kind,
      city_name,
      country_or_region,
      message,
      related_city_pack_id,
      status,
      created_at,
      tenant:tenants ( slug, name )
    `
    )
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data, error } = await query;

  if (error) {
    return { rows: [], error: error.message };
  }

  const dbRows = (data ?? []) as DbRow[];
  const uniqueUserIds = [...new Set(dbRows.map((row) => row.user_id))];
  const emailByUserId = await resolveContactEmails(uniqueUserIds);

  const rows = sortRequests(dbRows.map((row) => mapRow(row, emailByUserId)));

  return { rows, error: null };
}

export async function countPendingCityPackRequestsForAdmin(): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return 0;
  }

  const { count, error } = await admin
    .from('city_pack_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    return 0;
  }

  return count ?? 0;
}
