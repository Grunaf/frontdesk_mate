import {
  HOUSEKEEPING_BED_STATUSES,
  HOUSEKEEPING_ROOM_STATUSES,
  type HousekeepingBedStatus,
  type HousekeepingRoomStatus,
} from '../model/types';

export function isHousekeepingBedStatus(value: unknown): value is HousekeepingBedStatus {
  return (
    typeof value === 'string' &&
    (HOUSEKEEPING_BED_STATUSES as readonly string[]).includes(value)
  );
}

export function isHousekeepingRoomStatus(value: unknown): value is HousekeepingRoomStatus {
  return (
    typeof value === 'string' &&
    (HOUSEKEEPING_ROOM_STATUSES as readonly string[]).includes(value)
  );
}
