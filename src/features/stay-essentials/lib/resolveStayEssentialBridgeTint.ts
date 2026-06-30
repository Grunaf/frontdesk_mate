import type { StayEssentialBridgeId } from '../model/types';

/** Neutral pastel tints — product-owned, not per-tenant settings. */
export const STAY_ESSENTIAL_BRIDGE_TINTS: Record<StayEssentialBridgeId, string> = {
  wifi: '#b3c9de',
  checkout: '#ddd0be',
  nightAccess: '#c4bbd4',
  reception: '#b8ccb8',
};

export function resolveStayEssentialBridgeTint(bridgeId: StayEssentialBridgeId): string {
  return STAY_ESSENTIAL_BRIDGE_TINTS[bridgeId];
}
