import {
  HOUSEKEEPING_BED_STATUSES,
  type HousekeepingBedStatus,
} from '../model/types';

export const HOUSEKEEPING_BED_STATUS_LABELS: Record<HousekeepingBedStatus, string> = {
  needs_strip: 'Needs strip',
  stripped: 'Stripped',
  ready: 'Ready',
};

/** Primary action label for the next pipeline step (unset → strip). */
export const HOUSEKEEPING_BED_PRIMARY_ACTION_LABELS: Record<
  HousekeepingBedStatus | 'unset',
  string
> = {
  unset: 'Strip',
  needs_strip: 'Strip',
  stripped: 'Make',
  ready: 'Ready',
};

export function resolveHousekeepingBedPrimaryAction(
  status: HousekeepingBedStatus | undefined
): { label: string; nextStatus: HousekeepingBedStatus } | null {
  if (status === undefined || status === 'needs_strip') {
    return { label: 'Strip', nextStatus: 'stripped' };
  }
  if (status === 'stripped') {
    return { label: 'Make', nextStatus: 'ready' };
  }
  return null;
}

export function isHousekeepingBedNeedsWork(
  status: HousekeepingBedStatus | undefined
): boolean {
  return status === undefined || status === 'needs_strip' || status === 'stripped';
}

export type HousekeepingRoomBedBatchAction = {
  /** Button label without count, e.g. "Strip all". */
  label: string;
  nextStatus: HousekeepingBedStatus;
  /** Bed ids that will receive `nextStatus`. */
  bedIds: string[];
};

/**
 * Room-level primary CTA for batch housekeeping.
 * Strip eligible beds take priority over Make when both exist in the room.
 */
export function resolveRoomBedBatchAction(
  beds: ReadonlyArray<{ bedId: string; status: HousekeepingBedStatus | undefined }>
): HousekeepingRoomBedBatchAction | null {
  const stripIds: string[] = [];
  const makeIds: string[] = [];

  for (const bed of beds) {
    if (bed.status === undefined || bed.status === 'needs_strip') {
      stripIds.push(bed.bedId);
    } else if (bed.status === 'stripped') {
      makeIds.push(bed.bedId);
    }
  }

  if (stripIds.length > 0) {
    return { label: 'Strip all', nextStatus: 'stripped', bedIds: stripIds };
  }
  if (makeIds.length > 0) {
    return { label: 'Make all', nextStatus: 'ready', bedIds: makeIds };
  }
  return null;
}

export function listHousekeepingBedStatusChoices(): HousekeepingBedStatus[] {
  return [...HOUSEKEEPING_BED_STATUSES];
}
