import type { HousekeepingBedStatus, HousekeepingRoomStatus } from '@/entities/housekeeping';

import {
  resolveCleaningArrivalHint,
  sortCleaningTodoRoomsByBookingPriority,
  type CleaningArrivalHint,
} from './resolveCleaningBedPriority';

export type CleaningRoomGroup = {
  roomId: string;
  roomLabel: string;
  beds: ReadonlyArray<{ bedId: string; displayLabel: string }>;
};

export type CleaningBedEntry = {
  bedId: string;
  displayLabel: string;
  status: HousekeepingBedStatus | undefined;
  arrivalHint?: CleaningArrivalHint;
};

export type CleaningRoomBucket = {
  roomId: string;
  roomLabel: string;
  roomStatus: HousekeepingRoomStatus | undefined;
  beds: CleaningBedEntry[];
  /** Present when any todo bed in the room has a Today arrival. */
  todayArrivalCount?: number;
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

export type ResolveCleaningHubSnapshotOptions = {
  nextCheckInByBedId?: Record<string, string>;
  operationalDate?: string;
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

function enrichTodoRoomsWithArrivalPriority(
  rooms: CleaningRoomBucket[],
  nextCheckInByBedId: Record<string, string>,
  operationalDate: string
): CleaningRoomBucket[] {
  const sorted = sortCleaningTodoRoomsByBookingPriority(
    rooms,
    nextCheckInByBedId,
    operationalDate
  );

  return sorted.map((room) => {
    let todayArrivalCount = 0;
    const beds = room.beds.map((bed) => {
      const arrivalHint = resolveCleaningArrivalHint(
        nextCheckInByBedId[bed.bedId],
        operationalDate
      );
      if (arrivalHint === 'Today') todayArrivalCount += 1;
      return arrivalHint ? { ...bed, arrivalHint } : bed;
    });

    return todayArrivalCount > 0
      ? { ...room, beds, todayArrivalCount }
      : { ...room, beds };
  });
}

/** Split inventory into Strip · Make · Done hub counts + todo/done room lists. */
export function resolveCleaningHubSnapshot(
  roomGroups: readonly CleaningRoomGroup[],
  bedStatuses: Record<string, HousekeepingBedStatus>,
  roomStatuses: Record<string, HousekeepingRoomStatus> = {},
  options: ResolveCleaningHubSnapshotOptions = {}
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

  const todoRoomsRaw = filterRoomsByBedPredicate(
    roomGroups,
    bedStatuses,
    roomStatuses,
    isTodoBedStatus
  );
  const nextCheckInByBedId = options.nextCheckInByBedId ?? {};
  const operationalDate = options.operationalDate?.trim();
  const todoRooms = operationalDate
    ? enrichTodoRoomsWithArrivalPriority(todoRoomsRaw, nextCheckInByBedId, operationalDate)
    : todoRoomsRaw;

  return {
    stripCount,
    makeCount,
    doneCount,
    todoRooms,
    doneRooms: filterRoomsByBedPredicate(roomGroups, bedStatuses, roomStatuses, isDoneBedStatus),
  };
}
