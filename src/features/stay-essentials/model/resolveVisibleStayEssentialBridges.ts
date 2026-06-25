import { STAY_ESSENTIAL_BRIDGE_ORDER, type StayEssentialBridgeId } from './types';

/** Chat 4 adds night access visibility gate. */
export function resolveVisibleStayEssentialBridges(): StayEssentialBridgeId[] {
  return STAY_ESSENTIAL_BRIDGE_ORDER.filter((bridgeId) => bridgeId !== 'nightAccess');
}
