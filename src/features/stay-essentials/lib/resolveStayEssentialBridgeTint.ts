import type { StayEssentialBridgeId } from '../model/types';

/** Neutral pastel tints — product-owned, not per-tenant settings. */
export const STAY_ESSENTIAL_BRIDGE_TINTS: Record<StayEssentialBridgeId, string> = {
  wifi: '#d8e8f4',
  checkout: '#efe6da',
  nightAccess: '#e4dff0',
  reception: '#dce9dc',
};

export const STAY_ESSENTIAL_ARRIVAL_TILE_TINT = '#f0e8dc';

export function resolveStayEssentialBridgeTint(bridgeId: StayEssentialBridgeId): string {
  return STAY_ESSENTIAL_BRIDGE_TINTS[bridgeId];
}
