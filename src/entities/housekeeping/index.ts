export {
  HOUSEKEEPING_BED_STATUSES,
  HOUSEKEEPING_ROOM_STATUSES,
} from './model/types';
export type {
  HousekeepingBedStatus,
  HousekeepingBedStatusRecord,
  HousekeepingRoomStatus,
  HousekeepingRoomStatusRecord,
  UpsertHousekeepingBedStatusInput,
  UpsertHousekeepingRoomStatusInput,
  UpsertHousekeepingStatusResult,
} from './model/types';
export {
  isHousekeepingBedStatus,
  isHousekeepingRoomStatus,
} from './lib/isHousekeepingStatus';
