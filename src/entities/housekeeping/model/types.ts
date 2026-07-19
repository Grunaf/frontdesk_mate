export const HOUSEKEEPING_BED_STATUSES = ['ready', 'waiting_linen', 'no_linen'] as const;

export type HousekeepingBedStatus = (typeof HOUSEKEEPING_BED_STATUSES)[number];

export const HOUSEKEEPING_ROOM_STATUSES = ['cleaned', 'not_cleaned'] as const;

export type HousekeepingRoomStatus = (typeof HOUSEKEEPING_ROOM_STATUSES)[number];

export interface HousekeepingBedStatusRecord {
  tenant_id: string;
  bed_id: string;
  status: HousekeepingBedStatus;
  updated_at: string;
}

export interface HousekeepingRoomStatusRecord {
  tenant_id: string;
  room_id: string;
  status: HousekeepingRoomStatus;
  updated_at: string;
}

export type UpsertHousekeepingBedStatusInput = {
  tenantId: string;
  bedId: string;
  status: HousekeepingBedStatus;
};

export type UpsertHousekeepingRoomStatusInput = {
  tenantId: string;
  roomId: string;
  status: HousekeepingRoomStatus;
};

export type UpsertHousekeepingStatusResult =
  | { ok: true }
  | { ok: false; error: 'invalid_status' | 'db_unavailable' };
