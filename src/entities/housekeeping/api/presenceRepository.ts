import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { isHousekeepingStayPresenceStatus } from '../lib/stayPresence';
import type {
  ClearHousekeepingStayPresenceInput,
  HousekeepingStayPresenceRecord,
  UpsertHousekeepingStayPresenceInput,
  UpsertHousekeepingStatusResult,
} from '../model/types';

const COLUMNS =
  'tenant_id, stay_id, bed_id, status, set_by_reception_user_id, set_at';

function mapRow(row: Record<string, unknown>): HousekeepingStayPresenceRecord | null {
  if (!isHousekeepingStayPresenceStatus(row.status)) return null;
  return {
    tenant_id: String(row.tenant_id),
    stay_id: String(row.stay_id),
    bed_id: String(row.bed_id),
    status: row.status,
    set_by_reception_user_id: row.set_by_reception_user_id
      ? String(row.set_by_reception_user_id)
      : null,
    set_at: String(row.set_at),
  };
}

export async function listHousekeepingStayPresence(
  tenantId: string
): Promise<HousekeepingStayPresenceRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('housekeeping_stay_presence')
    .select(COLUMNS)
    .eq('tenant_id', tenantId);

  if (error || !data) {
    console.error('listHousekeepingStayPresence:', error?.message ?? 'no data');
    return [];
  }

  return data
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((row): row is HousekeepingStayPresenceRecord => row !== null);
}

export async function upsertHousekeepingStayPresence(
  input: UpsertHousekeepingStayPresenceInput
): Promise<UpsertHousekeepingStatusResult> {
  if (!isHousekeepingStayPresenceStatus(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }

  const stayId = input.stayId.trim();
  const bedId = input.bedId.trim();
  if (!stayId || !bedId) {
    return { ok: false, error: 'invalid_status' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { error } = await admin.from('housekeeping_stay_presence').upsert(
    {
      tenant_id: input.tenantId,
      stay_id: stayId,
      bed_id: bedId,
      status: input.status,
      set_by_reception_user_id: input.setByReceptionUserId ?? null,
      set_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,stay_id' }
  );

  if (error) {
    console.error('upsertHousekeepingStayPresence:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}

export async function clearHousekeepingStayPresence(
  input: ClearHousekeepingStayPresenceInput
): Promise<UpsertHousekeepingStatusResult> {
  const stayId = input.stayId.trim();
  if (!stayId) {
    return { ok: false, error: 'invalid_status' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { error } = await admin
    .from('housekeeping_stay_presence')
    .delete()
    .eq('tenant_id', input.tenantId)
    .eq('stay_id', stayId);

  if (error) {
    console.error('clearHousekeepingStayPresence:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}
