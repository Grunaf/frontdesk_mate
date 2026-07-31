import 'server-only';

import type { HousekeepingBedStatus, HousekeepingRoomStatus } from '@/entities/housekeeping';
import {
  hasHousekeepingBedRolloverRun,
  listHousekeepingBedStatuses,
  listHousekeepingRoomStatuses,
  recordHousekeepingBedRolloverRun,
  upsertHousekeepingBedStatus,
  upsertHousekeepingRoomStatus,
} from '@/entities/housekeeping/server';
import { listPlanGuestReservations } from '@/entities/guest-stay/server';
import type { TenantSettings } from '@/entities/tenant';
import {
  collectEmptyBedIdsToMark,
  listHousekeepingInventoryBedIds,
} from './resolveCheckoutBedsForHousekeeping';
import {
  collectRoomIdsToMarkNotCleaned,
  listHousekeepingInventoryRoomIds,
} from './resolveDailyRoomsForHousekeeping';
import { resolveOccupiedCleaningBedIds } from './resolveOccupiedCleaningBedIds';
import { todayUtcDate } from './guestAccessDates';
import {
  isBeforeTodaysOperationalRollover,
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from './resolveOperationalDay';

export type TenantHousekeepingDayRolloverTenant = {
  id: string;
  slug: string;
  settings: TenantSettings;
};

export type TenantHousekeepingDayRolloverResult =
  | {
      ok: true;
      operationalDate: string;
      markedBedCount: number;
      markedRoomCount: number;
      skippedBedCount: number;
      skippedRoomCount: number;
      dryRun: boolean;
    }
  | {
      ok: false;
      error: 'before_start' | 'already_rolled' | 'no_beds' | 'db_unavailable' | 'unknown';
      operationalDate?: string;
      startTimeLabel?: string;
      detail?: string;
    };

/**
 * Apply empty-bed + room rollover for one tenant.
 * `forceEarly`: allow run before operationalDayStartTime; ledger date = calendar today (UTC).
 */
export async function runTenantHousekeepingDayRollover(input: {
  tenant: TenantHousekeepingDayRolloverTenant;
  now?: Date;
  forceEarly?: boolean;
  dryRun?: boolean;
}): Promise<TenantHousekeepingDayRolloverResult> {
  const now = input.now ?? new Date();
  const dryRun = Boolean(input.dryRun);
  const guestStay = input.tenant.settings?.guestStay;
  const bedInventory = guestStay?.beds ?? [];
  if (bedInventory.length === 0) {
    return { ok: false, error: 'no_beds' };
  }

  const startTimeLabel = resolveOperationalDayStartTime(input.tenant.settings);
  const window = resolveOperationalDay(now, startTimeLabel);
  const calendarToday = todayUtcDate(now);
  const beforeStart = isBeforeTodaysOperationalRollover(now, startTimeLabel);

  if (beforeStart && !input.forceEarly) {
    return {
      ok: false,
      error: 'before_start',
      operationalDate: window.operationalDate,
      startTimeLabel,
    };
  }

  // After start, or early confirm: apply for calendar today (UTC).
  const operationalDate = calendarToday;

  const alreadyRolled = await hasHousekeepingBedRolloverRun(input.tenant.id, operationalDate);
  if (alreadyRolled) {
    return { ok: false, error: 'already_rolled', operationalDate, startTimeLabel };
  }

  let stays;
  try {
    stays = await listPlanGuestReservations(input.tenant.slug);
  } catch (error) {
    return {
      ok: false,
      error: 'unknown',
      detail: error instanceof Error ? error.message : 'listPlanGuestReservations',
    };
  }

  const [bedStatusRows, roomStatusRows] = await Promise.all([
    listHousekeepingBedStatuses(input.tenant.id),
    listHousekeepingRoomStatuses(input.tenant.id),
  ]);

  const bedStatuses: Record<string, HousekeepingBedStatus | undefined> = {};
  for (const row of bedStatusRows) {
    bedStatuses[row.bed_id] = row.status;
  }

  const roomStatuses: Record<string, HousekeepingRoomStatus | undefined> = {};
  for (const row of roomStatusRows) {
    roomStatuses[row.room_id] = row.status;
  }

  const occupiedBedIds = resolveOccupiedCleaningBedIds(stays, operationalDate);
  const inventoryBedIds = listHousekeepingInventoryBedIds(guestStay);
  const candidateBedIds = inventoryBedIds.filter((bedId) => !occupiedBedIds.has(bedId));
  const bedIds = collectEmptyBedIdsToMark(inventoryBedIds, occupiedBedIds, bedStatuses);
  const skippedBedCount = Math.max(0, candidateBedIds.length - bedIds.length);

  const inventoryRoomIds = listHousekeepingInventoryRoomIds(guestStay);
  const roomIds = collectRoomIdsToMarkNotCleaned(guestStay, roomStatuses);
  const skippedRoomCount = Math.max(0, inventoryRoomIds.length - roomIds.length);

  let markedBedCount = 0;
  let markedRoomCount = 0;

  for (const bedId of bedIds) {
    if (dryRun) {
      markedBedCount += 1;
      continue;
    }
    const result = await upsertHousekeepingBedStatus({
      tenantId: input.tenant.id,
      bedId,
      status: 'needs_strip',
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error === 'db_unavailable' ? 'db_unavailable' : 'unknown',
        detail: `bed ${bedId}`,
      };
    }
    markedBedCount += 1;
  }

  for (const roomId of roomIds) {
    if (dryRun) {
      markedRoomCount += 1;
      continue;
    }
    const result = await upsertHousekeepingRoomStatus({
      tenantId: input.tenant.id,
      roomId,
      status: 'not_cleaned',
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error === 'db_unavailable' ? 'db_unavailable' : 'unknown',
        detail: `room ${roomId}`,
      };
    }
    markedRoomCount += 1;
  }

  if (!dryRun) {
    const recorded = await recordHousekeepingBedRolloverRun(input.tenant.id, operationalDate);
    if (!recorded.ok && recorded.error === 'db_unavailable') {
      return { ok: false, error: 'db_unavailable', detail: 'ledger' };
    }
  }

  return {
    ok: true,
    operationalDate,
    markedBedCount,
    markedRoomCount,
    skippedBedCount,
    skippedRoomCount,
    dryRun,
  };
}
