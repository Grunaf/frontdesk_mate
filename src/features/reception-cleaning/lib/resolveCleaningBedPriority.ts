import { addStayCalendarDays, stayRecordCheckInDate } from '@/entities/guest-stay';

/** 0 = check-in today, 1 = tomorrow, 2 = no near booking. Lower is more urgent. */
export type CleaningBedBookingPriority = 0 | 1 | 2;

export type CleaningPriorityStay = {
  bed_id: string;
  check_in_at: string;
  check_in_date?: string | null;
  revoked_at?: string | null;
  is_archived?: boolean;
};

export type CleaningArrivalHint = 'Today' | 'Tomorrow';

/** Earliest check-in on/after operational day per bed (active stays only). */
export function resolveNextCheckInByBedId(
  stays: readonly CleaningPriorityStay[],
  operationalDate: string
): Record<string, string> {
  const nextByBedId: Record<string, string> = {};

  for (const stay of stays) {
    if (stay.is_archived || stay.revoked_at) continue;
    const bedId = stay.bed_id?.trim();
    if (!bedId) continue;

    const checkInDate = stayRecordCheckInDate(stay);
    if (checkInDate < operationalDate) continue;

    const current = nextByBedId[bedId];
    if (!current || checkInDate < current) {
      nextByBedId[bedId] = checkInDate;
    }
  }

  return nextByBedId;
}

export function resolveCleaningBedBookingPriority(
  nextCheckInDate: string | undefined,
  operationalDate: string
): CleaningBedBookingPriority {
  if (!nextCheckInDate) return 2;
  if (nextCheckInDate === operationalDate) return 0;
  if (nextCheckInDate === addStayCalendarDays(operationalDate, 1)) return 1;
  return 2;
}

export function resolveCleaningArrivalHint(
  nextCheckInDate: string | undefined,
  operationalDate: string
): CleaningArrivalHint | null {
  const priority = resolveCleaningBedBookingPriority(nextCheckInDate, operationalDate);
  if (priority === 0) return 'Today';
  if (priority === 1) return 'Tomorrow';
  return null;
}

export function compareCleaningBedBookingPriority(
  aCheckIn: string | undefined,
  bCheckIn: string | undefined,
  operationalDate: string
): number {
  const aPriority = resolveCleaningBedBookingPriority(aCheckIn, operationalDate);
  const bPriority = resolveCleaningBedBookingPriority(bCheckIn, operationalDate);
  if (aPriority !== bPriority) return aPriority - bPriority;

  // Within same priority band, earlier check-in first; missing dates last.
  if (aCheckIn && bCheckIn && aCheckIn !== bCheckIn) {
    return aCheckIn.localeCompare(bCheckIn);
  }
  if (aCheckIn && !bCheckIn) return -1;
  if (!aCheckIn && bCheckIn) return 1;
  return 0;
}

type SortableCleaningBed = {
  bedId: string;
  displayLabel: string;
};

type SortableCleaningRoom<TBed extends SortableCleaningBed> = {
  roomId: string;
  beds: TBed[];
};

/** Sort rooms by most urgent bed, then beds within each room. Stable on inventory labels. */
export function sortCleaningTodoRoomsByBookingPriority<TBed extends SortableCleaningBed>(
  rooms: readonly SortableCleaningRoom<TBed>[],
  nextCheckInByBedId: Record<string, string>,
  operationalDate: string
): Array<SortableCleaningRoom<TBed> & { beds: TBed[] }> {
  const roomRank = (room: SortableCleaningRoom<TBed>) => {
    let bestPriority: CleaningBedBookingPriority = 2;
    let bestCheckIn: string | undefined;
    for (const bed of room.beds) {
      const checkIn = nextCheckInByBedId[bed.bedId];
      const priority = resolveCleaningBedBookingPriority(checkIn, operationalDate);
      if (
        priority < bestPriority ||
        (priority === bestPriority &&
          checkIn &&
          (!bestCheckIn || checkIn < bestCheckIn))
      ) {
        bestPriority = priority;
        bestCheckIn = checkIn;
      }
    }
    return { bestPriority, bestCheckIn };
  };

  return [...rooms]
    .map((room) => ({
      ...room,
      beds: [...room.beds].sort((a, b) => {
        const byPriority = compareCleaningBedBookingPriority(
          nextCheckInByBedId[a.bedId],
          nextCheckInByBedId[b.bedId],
          operationalDate
        );
        if (byPriority !== 0) return byPriority;
        return a.displayLabel.localeCompare(b.displayLabel);
      }),
    }))
    .sort((a, b) => {
      const aRank = roomRank(a);
      const bRank = roomRank(b);
      if (aRank.bestPriority !== bRank.bestPriority) {
        return aRank.bestPriority - bRank.bestPriority;
      }
      if (aRank.bestCheckIn && bRank.bestCheckIn && aRank.bestCheckIn !== bRank.bestCheckIn) {
        return aRank.bestCheckIn.localeCompare(bRank.bestCheckIn);
      }
      if (aRank.bestCheckIn && !bRank.bestCheckIn) return -1;
      if (!aRank.bestCheckIn && bRank.bestCheckIn) return 1;
      return a.roomId.localeCompare(b.roomId);
    });
}
