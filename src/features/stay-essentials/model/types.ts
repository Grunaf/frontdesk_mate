export const STAY_ESSENTIAL_ARRIVAL_TILE_ID = 'arrivalGuide' as const;
export const STAY_ESSENTIAL_STAY_SETUP_TILE_ID = 'staySetup' as const;

export type StayEssentialArrivalTileId = typeof STAY_ESSENTIAL_ARRIVAL_TILE_ID;
export type StayEssentialStaySetupTileId = typeof STAY_ESSENTIAL_STAY_SETUP_TILE_ID;

export const STAY_ESSENTIAL_BRIDGE_ORDER = [
  'wifi',
  'checkout',
  'nightAccess',
  'reception',
] as const;

export type StayEssentialBridgeId = (typeof STAY_ESSENTIAL_BRIDGE_ORDER)[number];
