export type ArrivalLayoutKind = 'building_then_zones' | 'direct_to_floor';

export type AccessPointKind = 'outside' | 'zone';

export interface AccessPoint {
  id: string;
  kind?: AccessPointKind;
  /** Admin label; shown when no i18n title exists */
  label?: string;
  image?: string;
  code?: string;
  guideKey?: string;
  /** Guest floors that always need this point (e.g. ["1"]). Empty = all guests. */
  forFloors?: string[];
  /** Cross-floor access (e.g. floor 1 kitchen for floor 2 guests). */
  alsoForFloors?: string[];
  sortOrder?: number;
}

export interface ArrivalAccessConfig {
  layoutKind?: ArrivalLayoutKind;
  dayMode?: 'doorbell' | 'walk_in' | 'reception';
  landmark?: string;
  accessPoints?: AccessPoint[];
  /** Demo / MVP: map bed id → guest floor ("1", "2", …). */
  bedFloorMap?: Record<string, string>;
}
