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

export function listHousekeepingBedStatusChoices(): HousekeepingBedStatus[] {
  return [...HOUSEKEEPING_BED_STATUSES];
}
