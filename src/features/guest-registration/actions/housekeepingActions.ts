'use server';

import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { bedExistsInGuestStay } from '@/entities/guest-stay';
import {
  isHousekeepingBedStatus,
  isHousekeepingRoomStatus,
  type HousekeepingBedStatus,
  type HousekeepingRoomStatus,
} from '@/entities/housekeeping';
import {
  listHousekeepingBedStatuses,
  listHousekeepingRoomStatuses,
  upsertHousekeepingBedStatus,
  upsertHousekeepingRoomStatus,
} from '@/entities/housekeeping/server';
import { getTenantRecord } from '@/entities/tenant/server';
import type { TenantSettings } from '@/entities/tenant';

export type HousekeepingStatusMaps = {
  beds: Record<string, HousekeepingBedStatus>;
  rooms: Record<string, HousekeepingRoomStatus>;
};

export type HousekeepingActionResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'not_found' | 'invalid_status' | 'db_unavailable' | 'unknown' };

function roomExistsInGuestStay(settings: TenantSettings, roomId: string): boolean {
  const id = roomId.trim();
  if (!id || id.startsWith('__')) return false;
  if (settings.guestStay?.rooms?.some((room) => room.id === id)) return true;
  return (settings.guestStay?.beds ?? []).some((bed) => bed.roomId === id);
}

async function resolveAuthenticatedTenant(tenantSlug: string) {
  try {
    await assertReceptionAuthenticated(tenantSlug);
  } catch {
    return { ok: false as const, error: 'unauthorized' as const };
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
  await assertReceptionAuthenticated(tenantSlug);

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return { beds: {}, rooms: {} };
  }

  const [bedRows, roomRows] = await Promise.all([
    listHousekeepingBedStatuses(tenant.id),
    listHousekeepingRoomStatuses(tenant.id),
  ]);

  const beds: Record<string, HousekeepingBedStatus> = {};
  for (const row of bedRows) {
    beds[row.bed_id] = row.status;
  }

  const rooms: Record<string, HousekeepingRoomStatus> = {};
  for (const row of roomRows) {
    rooms[row.room_id] = row.status;
  }

  return { beds, rooms };
}

export async function upsertHousekeepingBedStatusAction(input: {
  tenantSlug: string;
  bedId: string;
  status: HousekeepingBedStatus;
}): Promise<HousekeepingActionResult> {
  const resolved = await resolveAuthenticatedTenant(input.tenantSlug);
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
  const resolved = await resolveAuthenticatedTenant(input.tenantSlug);
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
