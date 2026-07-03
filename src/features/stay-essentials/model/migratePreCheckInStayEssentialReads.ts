import {
  buildStayEssentialsPreCheckInReadStorageKey,
  buildStayEssentialsStayReadStorageKey,
  STAY_ESSENTIAL_PRE_CHECK_IN_MIGRATABLE_TILE_IDS,
  type StayEssentialReadTileId,
} from './buildStayEssentialsReadStorageKey';
import { persistStayEssentialRead, readStayEssentialRead } from './stayEssentialReadStorage';

export function migratePreCheckInStayEssentialReads(tenantSlug: string, stayId: string): void {
  for (const tileId of STAY_ESSENTIAL_PRE_CHECK_IN_MIGRATABLE_TILE_IDS) {
    const preCheckInKey = buildStayEssentialsPreCheckInReadStorageKey(tenantSlug, tileId);
    if (!readStayEssentialRead(preCheckInKey)) {
      continue;
    }

    const stayKey = buildStayEssentialsStayReadStorageKey(tenantSlug, stayId, tileId);
    persistStayEssentialRead(stayKey);
  }
}

export function resolveStayEssentialReadStorageKey(input: {
  tenantSlug: string;
  stayId: string | null;
  tileId: StayEssentialReadTileId;
}): string {
  if (input.stayId) {
    return buildStayEssentialsStayReadStorageKey(input.tenantSlug, input.stayId, input.tileId);
  }

  return buildStayEssentialsPreCheckInReadStorageKey(input.tenantSlug, input.tileId);
}
