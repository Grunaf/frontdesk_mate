'use server';

import { bedExistsInGuestStay } from '@/entities/guest-stay';
import {
  isHousekeepingBedStatus,
  isHousekeepingRoomStatus,
  type HousekeepingBedStatus,
  type HousekeepingLaundryRunRecord,
  type HousekeepingRoomStatus,
} from '@/entities/housekeeping';
import {
  listActiveLaundryRuns,
  listHousekeepingBedStatuses,
  listHousekeepingRoomStatuses,
  upsertHousekeepingBedStatus,
  upsertHousekeepingRoomStatus,
} from '@/entities/housekeeping/server';
import { getTenantRecord } from '@/entities/tenant/server';
import type { TenantSettings } from '@/entities/tenant';

import {
  assertReceptionHousekeepingAccess,
  resolveReceptionStaffContext,
} from '../lib/resolveReceptionStaffContext';

export type HousekeepingStatusMaps = {
  beds: Record<string, HousekeepingBedStatus>;
  rooms: Record<string, HousekeepingRoomStatus>;
  activeLaundryRuns: HousekeepingLaundryRunRecord[];
};

export type HousekeepingActionResult =
  | { ok: true }
  | {
      ok: false;
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'invalid_status' | 'db_unavailable' | 'unknown';
    };

function roomExistsInGuestStay(settings: TenantSettings, roomId: string): boolean {
  const id = roomId.trim();
  if (!id || id.startsWith('__')) return false;
  if (settings.guestStay?.rooms?.some((room) => room.id === id)) return true;
  return (settings.guestStay?.beds ?? []).some((bed) => bed.roomId === id);
}

async function resolveHousekeepingTenant(tenantSlug: string) {
  const staff = await resolveReceptionStaffContext(tenantSlug);
  if (!staff.ok) {
    return { ok: false as const, error: staff.error };
  }

  const gate = assertReceptionHousekeepingAccess(staff.ctx);
  if (!gate.ok) {
    return { ok: false as const, error: gate.error };
  }

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: 'not_found' as const };
  }

  return { ok: true as const, tenant };
}

export async function listHousekeepingStatusesAction(
  tenantSlug: string
): Promise<HousekeepingStatusMaps> {
  const resolved = await resolveHousekeepingTenant(tenantSlug);
  if (!resolved.ok) {
    return { beds: {}, rooms: {}, activeLaundryRuns: [] };
  }

  const [bedRows, roomRows, activeLaundryRuns] = await Promise.all([
    listHousekeepingBedStatuses(resolved.tenant.id),
    listHousekeepingRoomStatuses(resolved.tenant.id),
    listActiveLaundryRuns(resolved.tenant.id),
  ]);

  const beds: Record<string, HousekeepingBedStatus> = {};
  for (const row of bedRows) {
    beds[row.bed_id] = row.status;
  }

  const rooms: Record<string, HousekeepingRoomStatus> = {};
  for (const row of roomRows) {
    rooms[row.room_id] = row.status;
  }

  return { beds, rooms, activeLaundryRuns };
}

export async function upsertHousekeepingBedStatusAction(input: {
  tenantSlug: string;
  bedId: string;
  status: HousekeepingBedStatus;
}): Promise<HousekeepingActionResult> {
  const resolved = await resolveHousekeepingTenant(input.tenantSlug);
  if (!resolved.ok) return resolved;

  if (!isHousekeepingBedStatus(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }

  if (!bedExistsInGuestStay(resolved.tenant.settings, input.bedId)) {
    return { ok: false, error: 'not_found' };
  }

  try {
    const result = await upsertHousekeepingBedStatus({
      tenantId: resolved.tenant.id,
      bedId: input.bedId,
      status: input.status,
    });
    if (!result.ok) return result;
    return { ok: true };
  } catch (error) {
    console.error('upsertHousekeepingBedStatusAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function upsertHousekeepingRoomStatusAction(input: {
  tenantSlug: string;
  roomId: string;
  status: HousekeepingRoomStatus;
}): Promise<HousekeepingActionResult> {
  const resolved = await resolveHousekeepingTenant(input.tenantSlug);
  if (!resolved.ok) return resolved;

  if (!isHousekeepingRoomStatus(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }

  if (!roomExistsInGuestStay(resolved.tenant.settings, input.roomId)) {
    return { ok: false, error: 'not_found' };
  }

  try {
    const result = await upsertHousekeepingRoomStatus({
      tenantId: resolved.tenant.id,
      roomId: input.roomId,
      status: input.status,
    });
    if (!result.ok) return result;
    return { ok: true };
  } catch (error) {
    console.error('upsertHousekeepingRoomStatusAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
