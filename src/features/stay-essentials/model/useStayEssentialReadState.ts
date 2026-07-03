'use client';

import type { StayEssentialBridgeId } from './types';
import { useStayEssentialTileReadState } from './useStayEssentialTileReadState';

export function useStayEssentialReadState(bridgeId: StayEssentialBridgeId) {
  return useStayEssentialTileReadState(bridgeId);
}
