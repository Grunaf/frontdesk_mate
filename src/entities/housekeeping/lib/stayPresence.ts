import {
  HOUSEKEEPING_STAY_PRESENCE_STATUSES,
  type HousekeepingStayPresenceStatus,
} from '../model/types';

export const HOUSEKEEPING_STAY_PRESENCE_LABELS: Record<
  HousekeepingStayPresenceStatus,
  string
> = {
  vacant: 'Vacant',
  still_here: 'Still here',
};

export function isHousekeepingStayPresenceStatus(
  value: unknown
): value is HousekeepingStayPresenceStatus {
  return (
    typeof value === 'string' &&
    (HOUSEKEEPING_STAY_PRESENCE_STATUSES as readonly string[]).includes(value)
  );
}

export function housekeepingStayPresenceDeskLabel(
  status: HousekeepingStayPresenceStatus | undefined
): string | null {
  if (status === 'vacant') return 'Cleaning: vacant';
  if (status === 'still_here') return 'Cleaning: still here';
  return null;
}
