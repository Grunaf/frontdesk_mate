import type { StayEssentialBridgeId } from '../model/types';

/** Neutral pastel tints — product-owned, not per-tenant settings. */
export const STAY_ESSENTIAL_BRIDGE_TINTS: Record<StayEssentialBridgeId, string> = {
  wifi: '#c9e6fe',
  checkout: '#fbe4c4',
  nightAccess: '#d9c8f8',
  reception: '#d7fad7',
  contact: '#e8e0f0',
};

export const STAY_ESSENTIAL_ARRIVAL_TILE_TINT = '#f0e8dc';

export function resolveStayEssentialBridgeTint(bridgeId: StayEssentialBridgeId): string {
  return STAY_ESSENTIAL_BRIDGE_TINTS[bridgeId];
}
