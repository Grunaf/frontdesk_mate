import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { resolveGuestAccessStatus } from '@/entities/guest-stay/lib/guestAccessIntervals';
import type { TenantSettings } from '@/entities/tenant';
import {
  flattenBedInventory,
  resolveBedInventory,
  type BedInventoryEntry,
  type BedInventoryRoomGroup,
} from './resolveBedInventory';
import {
  isBeforeTodaysOperationalRollover,
  resolveOperationalDay,
  resolveOperationalDayStartTime,
  type OperationalDayWindow,
} from './resolveOperationalDay';

export interface ReceptionHubSnapshot {
  operationalDayStartTime: string;
  operational: OperationalDayWindow;
  expectedToday: GuestStayRecordWithLink[];
  stillExpected: GuestStayRecordWithLink[];
  noShow: GuestStayRecordWithLink[];
  freeBedEntries: BedInventoryEntry[];
  freeBedRoomGroups: BedInventoryRoomGroup[];
  orphanStays: GuestStayRecordWithLink[];
}

function sortByCheckIn(stays: GuestStayRecordWithLink[]): GuestStayRecordWithLink[] {
  return [...stays].sort(
    (a, b) => new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime()
  );
}

/** Reception “arrived” toggle — guest has been marked in at the desk (opens app path). */
export function hasGuestArrivedAtReception(
  stay: Pick<GuestStayRecordWithLink, 'activated_at'>
): boolean {
  return Boolean(stay.activated_at);
}

function isAwaitingArrival(stay: GuestStayRecordWithLink, now: Date): boolean {
  if (stay.revoked_at || hasGuestArrivedAtReception(stay)) {
    return false;
  }
  const status = resolveGuestAccessStatus(stay, now);
  return status !== 'ended' && status !== 'revoked';
}

function checkInDateSlice(stay: GuestStayRecordWithLink): string {
  return stay.check_in_at.slice(0, 10);
}

export type ReceptionHubStayBucket = 'expectedToday' | 'stillExpected' | 'noShow' | null;

export function classifyReceptionHubStay(
  stay: GuestStayRecordWithLink,
  input: {
    operationalDate: string;
    now: Date;
    operationalDayStartTime: string;
  }
): ReceptionHubStayBucket {
  if (!isAwaitingArrival(stay, input.now)) {
    return null;
  }

  const checkInDay = checkInDateSlice(stay);
  const { operationalDate, now, operationalDayStartTime } = input;

  if (checkInDay === operationalDate) {
    return 'expectedToday';
  }

  if (checkInDay < operationalDate) {
    if (isBeforeTodaysOperationalRollover(now, operationalDayStartTime)) {
      return 'stillExpected';
    }
    return 'noShow';
  }

  return null;
}

function buildFreeBedRoomGroups(
  roomGroups: BedInventoryRoomGroup[],
  freeIds: Set<string>
): BedInventoryRoomGroup[] {
  return roomGroups
    .map((group) => ({
      ...group,
      beds: group.beds.filter((entry) => freeIds.has(entry.bedId)),
    }))
    .filter((group) => group.beds.length > 0);
}

export function resolveReceptionHubSnapshot(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[],
  now: Date = new Date()
): ReceptionHubSnapshot {
  const operationalDayStartTime = resolveOperationalDayStartTime(settings);
  const operational = resolveOperationalDay(now, operationalDayStartTime);
  const { operationalDate } = operational;

  const inventory = resolveBedInventory(settings, stays, {
    nightDate: operationalDate,
    now,
  });
  const allEntries = flattenBedInventory(inventory);
  const freeBedEntries = allEntries.filter((entry) => entry.status === 'free');
  const freeIds = new Set(freeBedEntries.map((entry) => entry.bedId));
  const freeBedRoomGroups = buildFreeBedRoomGroups(inventory.roomGroups, freeIds);

  const expectedToday: GuestStayRecordWithLink[] = [];
  const stillExpected: GuestStayRecordWithLink[] = [];
  const noShow: GuestStayRecordWithLink[] = [];

  for (const stay of stays) {
    const bucket = classifyReceptionHubStay(stay, {
      operationalDate,
      now,
      operationalDayStartTime,
    });
    if (bucket === 'expectedToday') expectedToday.push(stay);
    else if (bucket === 'stillExpected') stillExpected.push(stay);
    else if (bucket === 'noShow') noShow.push(stay);
  }

  return {
    operationalDayStartTime,
    operational,
    expectedToday: sortByCheckIn(expectedToday),
    stillExpected: sortByCheckIn(stillExpected),
    noShow: sortByCheckIn(noShow),
    freeBedEntries,
    freeBedRoomGroups,
    orphanStays: sortByCheckIn(inventory.orphanStays),
  };
}
