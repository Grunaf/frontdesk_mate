import type { StayEssentialBridgeId } from './types';

export function buildStayEssentialsReadStorageKey(
  tenantSlug: string,
  stayId: string,
  bridgeId: StayEssentialBridgeId
): string {
  return `stayEssentialsRead:${tenantSlug}:${stayId}:${bridgeId}`;
}
