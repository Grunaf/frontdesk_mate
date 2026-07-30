import {
  HOUSEKEEPING_STAY_PRESENCE_SOURCES,
  HOUSEKEEPING_STAY_PRESENCE_STATUSES,
  type HousekeepingStayPresenceSource,
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

export function isHousekeepingStayPresenceSource(
  value: unknown
): value is HousekeepingStayPresenceSource {
  return (
    typeof value === 'string' &&
    (HOUSEKEEPING_STAY_PRESENCE_SOURCES as readonly string[]).includes(value)
  );
}

export function housekeepingStayPresenceDeskLabel(
  status: HousekeepingStayPresenceStatus | undefined
): string | null {
  if (status === 'vacant') return 'Cleaning: vacant';
  if (status === 'still_here') return 'Cleaning: still here';
  return null;
}

export type StayPresenceSnapshot = {
  status: HousekeepingStayPresenceStatus;
  source: HousekeepingStayPresenceSource;
};

/** Guest CTA: hide when already vacant (any source). */
export function canGuestMarkStayVacant(
  current: StayPresenceSnapshot | null | undefined
): boolean {
  return current == null || current.status !== 'vacant';
}

/** Guest undo: only clear a guest-authored signal. */
export function canGuestClearStayPresence(
  current: StayPresenceSnapshot | null | undefined
): boolean {
  return current != null && current.source === 'guest';
}

/** Guest may only write vacant + source=guest. */
export function isValidGuestStayPresenceUpsert(input: {
  status: HousekeepingStayPresenceStatus;
  source: HousekeepingStayPresenceSource;
}): boolean {
  return input.status === 'vacant' && input.source === 'guest';
}
