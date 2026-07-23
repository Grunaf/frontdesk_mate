import type { HousekeepingBedStatus, HousekeepingRoomStatus } from '@/entities/housekeeping';

export type CleaningRoomGroup = {
  roomId: string;
  roomLabel: string;
  beds: Array<{ bedId: string; displayLabel: string }>;
};

export type CleaningBedEntry = {
  bedId: string;
  displayLabel: string;
  status: HousekeepingBedStatus | undefined;
};

export type CleaningRoomBucket = {
  roomId: string;
  roomLabel: string;
  roomStatus: HousekeepingRoomStatus | undefined;
  beds: CleaningBedEntry[];
};

export type CleaningHubSnapshot = {
  /** Unset + needs_strip */
  stripCount: number;
  /** stripped — ready to make */
  makeCount: number;
  doneCount: number;
  todoRooms: CleaningRoomBucket[];
  doneRooms: CleaningRoomBucket[];
};

/** Hub "Strip": unset or needs_strip */
export function isStripBedStatus(status: HousekeepingBedStatus | undefined): boolean {
  return status === undefined || status === 'needs_strip';
}

export function isMakeBedStatus(status: HousekeepingBedStatus | undefined): boolean {
  return status === 'stripped';
}

export function isDoneBedStatus(status: HousekeepingBedStatus | undefined): boolean {
  return status === 'ready';
}

export function isTodoBedStatus(status: HousekeepingBedStatus | undefined): boolean {
  return isStripBedStatus(status) || isMakeBedStatus(status);
}

function filterRoomsByBedPredicate(
  roomGroups: readonly CleaningRoomGroup[],
  bedStatuses: Record<string, HousekeepingBedStatus>,
  roomStatuses: Record<string, HousekeepingRoomStatus>,
  predicate: (status: HousekeepingBedStatus | undefined) => boolean
): CleaningRoomBucket[] {
  const result: CleaningRoomBucket[] = [];

  for (const group of roomGroups) {
    const beds = group.beds
      .map((bed) => ({
        bedId: bed.bedId,
        displayLabel: bed.displayLabel,
        status: bedStatuses[bed.bedId],
      }))
      .filter((bed) => predicate(bed.status));

    if (beds.length === 0) continue;

    result.push({
      roomId: group.roomId,
      roomLabel: group.roomLabel,
      roomStatus: roomStatuses[group.roomId],
      beds,
    });
  }

  return result;
}

/** Split inventory into Strip · Make · Done hub counts + todo/done room lists. */
export function resolveCleaningHubSnapshot(
  roomGroups: readonly CleaningRoomGroup[],
  bedStatuses: Record<string, HousekeepingBedStatus>,
  roomStatuses: Record<string, HousekeepingRoomStatus> = {}
): CleaningHubSnapshot {
  let stripCount = 0;
  let makeCount = 0;
  let doneCount = 0;

  for (const group of roomGroups) {
    for (const bed of group.beds) {
      const status = bedStatuses[bed.bedId];
      if (isStripBedStatus(status)) stripCount += 1;
      else if (isMakeBedStatus(status)) makeCount += 1;
      else if (isDoneBedStatus(status)) doneCount += 1;
    }
  }

  return {
    stripCount,
    makeCount,
    doneCount,
    todoRooms: filterRoomsByBedPredicate(roomGroups, bedStatuses, roomStatuses, isTodoBedStatus),
    doneRooms: filterRoomsByBedPredicate(roomGroups, bedStatuses, roomStatuses, isDoneBedStatus),
  };
}
