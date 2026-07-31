import 'server-only';

/**
 * Daily housekeeping rollover (all tenants):
 * - empty beds tonight → Needs strip (unset/Ready only; keep stripped for Make)
 * - inventory rooms → Not cleaned
 *
 * Vercel Cron: `GET /api/cron/housekeeping-bed-rollover` (`CRON_SECRET`).
 * Optional: `HOUSEKEEPING_BED_ROLLOVER_DRY_RUN=1`.
 */

import { listTenants } from '@/entities/tenant/server';
import { runTenantHousekeepingDayRollover } from '../lib/runTenantHousekeepingDayRollover';

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

    const bedInventory = tenant.settings?.guestStay?.beds ?? [];
    if (bedInventory.length === 0) {
      skippedTenantCount += 1;
      continue;
    }

    const result = await runTenantHousekeepingDayRollover({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        settings: tenant.settings,
      },
      now,
      dryRun,
    });

    if (!result.ok) {
      if (result.error === 'before_start') {
        skippedBeforeStartCount += 1;
        continue;
      }
      if (result.error === 'already_rolled') {
        skippedAlreadyRolledCount += 1;
        continue;
      }
      if (result.error === 'no_beds') {
        skippedTenantCount += 1;
        continue;
      }
      errors.push(
        `slug=${tenant.slug}: ${result.error}${result.detail ? ` (${result.detail})` : ''}`
      );
      continue;
    }

    markedBedCount += result.markedBedCount;
    skippedBedCount += result.skippedBedCount;
    markedRoomCount += result.markedRoomCount;
    skippedRoomCount += result.skippedRoomCount;

    console.info('[housekeeping-bed-rollover] tenant', {
      tenant_id: tenant.id,
      slug: tenant.slug,
      operational_date: result.operationalDate,
      marked_bed_count: result.markedBedCount,
      marked_room_count: result.markedRoomCount,
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
