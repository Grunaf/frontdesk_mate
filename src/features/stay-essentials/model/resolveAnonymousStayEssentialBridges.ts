import { STAY_ESSENTIAL_BRIDGE_ORDER, type StayEssentialBridgeId } from './types';

export function resolveAnonymousStayEssentialBridgeIds(
  hasReceptionContent: boolean
): StayEssentialBridgeId[] {
  if (!hasReceptionContent) {
    return [];
  }

  return STAY_ESSENTIAL_BRIDGE_ORDER.filter((bridgeId) => bridgeId === 'reception');
}
