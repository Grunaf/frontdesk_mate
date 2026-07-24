import 'server-only';

/**
 * Daily housekeeping rollover:
 * - checkout-night beds → Needs strip
 * - all inventory rooms → Not cleaned
 *
 * For each tenant, after that tenant's operational day has started:
 * - beds whose admitted stay last night was the previous operational night
 *   (checkout today) become `needs_strip` — unless already Needs strip / Stripped
 * - every guestStay room becomes `not_cleaned` — unless already Not cleaned
 *
 * Runs at most once per tenant + operational_date (ledger table).
 *
 * ## Ops / cron
 *
 * Vercel Cron every 15 minutes: `GET /api/cron/housekeeping-bed-rollover`
 * (`CRON_SECRET`). Job no-ops until each tenant's `operationalDayStartTime`
 * window and skips if already rolled that operational day.
 * Optional: `HOUSEKEEPING_BED_ROLLOVER_DRY_RUN=1` — log only; no upserts, no ledger.
 */

import { addStayCalendarDays } from '@/entities/guest-stay';
import { listPlanGuestReservations } from '@/entities/guest-stay/server';
import type { HousekeepingBedStatus, HousekeepingRoomStatus } from '@/entities/housekeeping';
import {
  hasHousekeepingBedRolloverRun,
  listHousekeepingBedStatuses,
  listHousekeepingRoomStatuses,
  recordHousekeepingBedRolloverRun,
  upsertHousekeepingBedStatus,
  upsertHousekeepingRoomStatus,
} from '@/entities/housekeeping/server';
import { listTenants } from '@/entities/tenant/server';
import { collectCheckoutBedIdsToMark, shouldMarkBedNeedsStrip } from '../lib/resolveCheckoutBedsForHousekeeping';
import {
  collectRoomIdsToMarkNotCleaned,
  listHousekeepingInventoryRoomIds,
} from '../lib/resolveDailyRoomsForHousekeeping';
import { resolveHousekeepingBedRolloverGate } from '../lib/resolveHousekeepingBedRolloverGate';
import {
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from '../lib/resolveOperationalDay';

export type MarkCheckoutBedsNeedsStripResult = {
  dryRun: boolean;
  tenantCount: number;
  skippedTenantCount: number;
  skippedBeforeStartCount: number;
  skippedAlreadyRolledCount: number;
  markedBedCount: number;
  skippedBedCount: number;
  markedRoomCount: number;
  skippedRoomCount: number;
  errors: string[];
};

function isDryRun(): boolean {
  const raw = process.env.HOUSEKEEPING_BED_ROLLOVER_DRY_RUN?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export async function markCheckoutBedsNeedsStrip(
  now: Date = new Date()
): Promise<MarkCheckoutBedsNeedsStripResult> {
  const dryRun = isDryRun();
  const { tenants, error: tenantsError } = await listTenants();

  if (tenantsError) {
    return {
      dryRun,
      tenantCount: 0,
      skippedTenantCount: 0,
      skippedBeforeStartCount: 0,
      skippedAlreadyRolledCount: 0,
      markedBedCount: 0,
      skippedBedCount: 0,
      markedRoomCount: 0,
      skippedRoomCount: 0,
      errors: [`listTenants: ${tenantsError}`],
    };
  }

  let skippedTenantCount = 0;
  let skippedBeforeStartCount = 0;
  let skippedAlreadyRolledCount = 0;
  let markedBedCount = 0;
  let skippedBedCount = 0;
  let markedRoomCount = 0;
  let skippedRoomCount = 0;
  const errors: string[] = [];

  for (const tenant of tenants) {
    if (tenant.archived_at) {
      skippedTenantCount += 1;
      continue;
    }

    const guestStay = tenant.settings?.guestStay;
    const bedInventory = guestStay?.beds ?? [];
    if (bedInventory.length === 0) {
      skippedTenantCount += 1;
      continue;
    }

    const operationalDayStartTime = resolveOperationalDayStartTime(tenant.settings);
    const operational = resolveOperationalDay(now, operationalDayStartTime);
    const alreadyRolled = await hasHousekeepingBedRolloverRun(
      tenant.id,
      operational.operationalDate
    );
    const gate = resolveHousekeepingBedRolloverGate({
      now,
      startsAt: operational.startsAt,
      alreadyRolled,
    });

    if (gate === 'before_start') {
      skippedBeforeStartCount += 1;
      continue;
    }
    if (gate === 'already_rolled') {
      skippedAlreadyRolledCount += 1;
      continue;
    }

    const targetNight = addStayCalendarDays(operational.operationalDate, -1);

    let stays;
    try {
      stays = await listPlanGuestReservations(tenant.slug);
    } catch (error) {
      errors.push(
        `listPlanGuestReservations slug=${tenant.slug}: ${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
      continue;
    }

    const [bedStatusRows, roomStatusRows] = await Promise.all([
      listHousekeepingBedStatuses(tenant.id),
      listHousekeepingRoomStatuses(tenant.id),
    ]);

    const bedStatuses: Record<string, HousekeepingBedStatus | undefined> = {};
    for (const row of bedStatusRows) {
      bedStatuses[row.bed_id] = row.status;
    }

    const roomStatuses: Record<string, HousekeepingRoomStatus | undefined> = {};
    for (const row of roomStatusRows) {
      roomStatuses[row.room_id] = row.status;
    }

    const candidateBedIds = collectCheckoutBedIdsToMark(stays, targetNight);
    const bedIds = candidateBedIds.filter((bedId) => shouldMarkBedNeedsStrip(bedStatuses[bedId]));
    skippedBedCount += Math.max(0, candidateBedIds.length - bedIds.length);

    const inventoryRoomIds = listHousekeepingInventoryRoomIds(guestStay);
    const roomIds = collectRoomIdsToMarkNotCleaned(guestStay, roomStatuses);
    skippedRoomCount += Math.max(0, inventoryRoomIds.length - roomIds.length);

    for (const bedId of bedIds) {
      if (dryRun) {
        console.info('[housekeeping-bed-rollover] dry-run mark bed', {
          tenant_id: tenant.id,
          slug: tenant.slug,
          bed_id: bedId,
          target_night: targetNight,
          operational_date: operational.operationalDate,
        });
        markedBedCount += 1;
        continue;
      }

      const result = await upsertHousekeepingBedStatus({
        tenantId: tenant.id,
        bedId,
        status: 'needs_strip',
      });

      if (!result.ok) {
        errors.push(
          `upsert bed_id=${bedId} slug=${tenant.slug}: ${result.error}`
        );
        continue;
      }

      markedBedCount += 1;
    }

    for (const roomId of roomIds) {
      if (dryRun) {
        console.info('[housekeeping-bed-rollover] dry-run mark room', {
          tenant_id: tenant.id,
          slug: tenant.slug,
          room_id: roomId,
          operational_date: operational.operationalDate,
        });
        markedRoomCount += 1;
        continue;
      }

      const result = await upsertHousekeepingRoomStatus({
        tenantId: tenant.id,
        roomId,
        status: 'not_cleaned',
      });

      if (!result.ok) {
        errors.push(
          `upsert room_id=${roomId} slug=${tenant.slug}: ${result.error}`
        );
        continue;
      }

      markedRoomCount += 1;
    }

    if (!dryRun) {
      const recorded = await recordHousekeepingBedRolloverRun(
        tenant.id,
        operational.operationalDate
      );
      if (!recorded.ok && recorded.error === 'db_unavailable') {
        errors.push(`ledger slug=${tenant.slug}: db_unavailable`);
      }
    }

    console.info('[housekeeping-bed-rollover] tenant', {
      tenant_id: tenant.id,
      slug: tenant.slug,
      target_night: targetNight,
      operational_date: operational.operationalDate,
      marked_bed_count: bedIds.length,
      marked_room_count: roomIds.length,
      dry_run: dryRun,
    });
  }

  return {
    dryRun,
    tenantCount: tenants.length,
    skippedTenantCount,
    skippedBeforeStartCount,
    skippedAlreadyRolledCount,
    markedBedCount,
    skippedBedCount,
    markedRoomCount,
    skippedRoomCount,
    errors,
  };
}
