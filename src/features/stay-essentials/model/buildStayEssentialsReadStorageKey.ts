import {
  STAY_ESSENTIAL_ARRIVAL_TILE_ID,
  STAY_ESSENTIAL_STAY_SETUP_TILE_ID,
  type StayEssentialArrivalTileId,
  type StayEssentialBridgeId,
  type StayEssentialStaySetupTileId,
} from './types';

export const STAY_ESSENTIAL_PRE_CHECK_IN_SCOPE = 'preCheckIn' as const;

export type StayEssentialReadTileId =
  | StayEssentialArrivalTileId
  | StayEssentialStaySetupTileId
  | StayEssentialBridgeId;

export const STAY_ESSENTIAL_PRE_CHECK_IN_MIGRATABLE_TILE_IDS = [
  STAY_ESSENTIAL_ARRIVAL_TILE_ID,
  'reception',
] as const satisfies readonly StayEssentialReadTileId[];

export function buildStayEssentialsPreCheckInReadStorageKey(
  tenantSlug: string,
  tileId: StayEssentialReadTileId
): string {
  return `stayEssentialsRead:${tenantSlug}:${STAY_ESSENTIAL_PRE_CHECK_IN_SCOPE}:${tileId}`;
}

export function buildStayEssentialsStayReadStorageKey(
  tenantSlug: string,
  stayId: string,
  tileId: StayEssentialReadTileId
): string {
  return `stayEssentialsRead:${tenantSlug}:${stayId}:${tileId}`;
}

/** @deprecated Use {@link buildStayEssentialsStayReadStorageKey} for new code. */
export function buildStayEssentialsReadStorageKey(
  tenantSlug: string,
  stayId: string,
  bridgeId: StayEssentialBridgeId
): string {
  return buildStayEssentialsStayReadStorageKey(tenantSlug, stayId, bridgeId);
}
