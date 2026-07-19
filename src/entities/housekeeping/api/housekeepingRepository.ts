import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import {
  isHousekeepingBedStatus,
  isHousekeepingRoomStatus,
} from '../lib/isHousekeepingStatus';
import type {
  HousekeepingBedStatusRecord,
  HousekeepingRoomStatusRecord,
  UpsertHousekeepingBedStatusInput,
  UpsertHousekeepingRoomStatusInput,
  UpsertHousekeepingStatusResult,
} from '../model/types';

const BED_COLUMNS = 'tenant_id, bed_id, status, updated_at';
const ROOM_COLUMNS = 'tenant_id, room_id, status, updated_at';

function mapBedRow(row: Record<string, unknown>): HousekeepingBedStatusRecord | null {
  if (!isHousekeepingBedStatus(row.status)) return null;
  return {
    tenant_id: String(row.tenant_id),
    bed_id: String(row.bed_id),
    status: row.status,
    updated_at: String(row.updated_at),
  };
}

function mapRoomRow(row: Record<string, unknown>): HousekeepingRoomStatusRecord | null {
  if (!isHousekeepingRoomStatus(row.status)) return null;
  return {
    tenant_id: String(row.tenant_id),
    room_id: String(row.room_id),
    status: row.status,
    updated_at: String(row.updated_at),
  };
}

/** Returns only rows that exist. Missing bed/room ids are unset — callers must not invent defaults. */
export async function listHousekeepingBedStatuses(
  tenantId: string
): Promise<HousekeepingBedStatusRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('housekeeping_bed_statuses')
    .select(BED_COLUMNS)
    .eq('tenant_id', tenantId);

  if (error || !data) {
    console.error('listHousekeepingBedStatuses:', error?.message ?? 'no data');
    return [];
  }

  return data
    .map((row) => mapBedRow(row as Record<string, unknown>))
    .filter((row): row is HousekeepingBedStatusRecord => row !== null);
}

/** Returns only rows that exist. Missing room ids are unset — callers must not invent defaults. */
export async function listHousekeepingRoomStatuses(
  tenantId: string
): Promise<HousekeepingRoomStatusRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('housekeeping_room_statuses')
    .select(ROOM_COLUMNS)
    .eq('tenant_id', tenantId);

  if (error || !data) {
    console.error('listHousekeepingRoomStatuses:', error?.message ?? 'no data');
    return [];
  }

  return data
    .map((row) => mapRoomRow(row as Record<string, unknown>))
    .filter((row): row is HousekeepingRoomStatusRecord => row !== null);
}

export async function upsertHousekeepingBedStatus(
  input: UpsertHousekeepingBedStatusInput
): Promise<UpsertHousekeepingStatusResult> {
  if (!isHousekeepingBedStatus(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }

  const bedId = input.bedId.trim();
  if (!bedId) {
    return { ok: false, error: 'invalid_status' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { error } = await admin.from('housekeeping_bed_statuses').upsert(
    {
      tenant_id: input.tenantId,
      bed_id: bedId,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,bed_id' }
  );

  if (error) {
    console.error('upsertHousekeepingBedStatus:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}

export async function upsertHousekeepingRoomStatus(
  input: UpsertHousekeepingRoomStatusInput
): Promise<UpsertHousekeepingStatusResult> {
  if (!isHousekeepingRoomStatus(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }

  const roomId = input.roomId.trim();
  if (!roomId) {
    return { ok: false, error: 'invalid_status' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { error } = await admin.from('housekeeping_room_statuses').upsert(
    {
      tenant_id: input.tenantId,
      room_id: roomId,
      status: input.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,room_id' }
  );

  if (error) {
    console.error('upsertHousekeepingRoomStatus:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}
