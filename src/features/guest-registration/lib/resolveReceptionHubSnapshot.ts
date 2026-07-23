import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  addStayCalendarDays,
  stayRecordCheckOutDate,
} from '@/entities/guest-stay';
import {
  guestAccessCheckInPolicyFromSettings,
  guestStayCoversNight,
  resolveGuestAccessStatus,
  type GuestAccessCheckInPolicy,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import type { TenantSettings } from '@/entities/tenant';
import { isValidTimeValue } from '@/shared/lib/time';
import {
  flattenBedInventory,
  resolveBedInventory,
  type BedInventoryEntry,
} from './resolveBedInventory';
import {
  resolveDepartureSectionPhase,
  resolveDeparturesSectionPhase,
  type DepartureSectionPhase,
} from './resolveDepartureSectionPhase';
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
  /** Active stays covering the operational night without `booking_paid_at`. */
  unpaid: GuestStayRecordWithLink[];
  /** Admitted stays covering the operational night without `key_issued_at`. */
  keyNotIssued: GuestStayRecordWithLink[];
  /**
   * Admitted stays departing this operational day (last night or check-out calendar day).
   */
  departures: GuestStayRecordWithLink[];
  /** Most urgent phase among `departures` (no checkOutTime → always ahead). */
  departurePhase: DepartureSectionPhase;
  /** Tenant check-out HH:mm when valid; otherwise null (no escalation / no time label). */
  checkOutTimeLabel: string | null;
  freeBedEntries: BedInventoryEntry[];
  occupiedBedCount: number;
  orphanStays: GuestStayRecordWithLink[];
}

function sortByCheckIn(stays: GuestStayRecordWithLink[]): GuestStayRecordWithLink[] {
  return [...stays].sort(
    (a, b) => new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime()
  );
}

/** Reception “admitted” — passport verified at desk (fallback: legacy desk arrival). */
export function hasGuestArrivedAtReception(
  stay: Pick<GuestStayRecordWithLink, 'passport_checked_at' | 'desk_checked_in_at'>
): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

function isAwaitingArrival(
  stay: GuestStayRecordWithLink,
  now: Date,
  policy?: GuestAccessCheckInPolicy | null
): boolean {
  if (stay.revoked_at || hasGuestArrivedAtReception(stay)) {
    return false;
  }
  const status = resolveGuestAccessStatus(stay, now, policy);
  return status !== 'ended' && status !== 'revoked';
}

function checkInDateSlice(stay: GuestStayRecordWithLink): string {
  return stay.check_in_date?.slice(0, 10) || stay.check_in_at.slice(0, 10);
}

/** Stays on the current operational night desk shift (not archived / revoked). */
function isOperationalNightDeskStay(
  stay: GuestStayRecordWithLink,
  operationalDate: string
): boolean {
  if (stay.is_archived || stay.revoked_at) return false;
  return guestStayCoversNight(stay, operationalDate);
}

/** Last occupied night or exclusive check-out morning for this operational day. */
export function isDepartureDeskStay(
  stay: GuestStayRecordWithLink,
  operationalDate: string
): boolean {
  if (stay.is_archived || stay.revoked_at) return false;
  if (!hasGuestArrivedAtReception(stay)) return false;

  const checkOutDate = stayRecordCheckOutDate(stay);
  const lastNight = addStayCalendarDays(checkOutDate, -1);
  return operationalDate === lastNight || operationalDate === checkOutDate;
}

export type ReceptionHubStayBucket = 'expectedToday' | 'stillExpected' | 'noShow' | null;

export function classifyReceptionHubStay(
  stay: GuestStayRecordWithLink,
  input: {
    operationalDate: string;
    now: Date;
    operationalDayStartTime: string;
    policy?: GuestAccessCheckInPolicy | null;
  }
): ReceptionHubStayBucket {
  if (!isAwaitingArrival(stay, input.now, input.policy)) {
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

function resolveCheckOutTimeLabel(
  settings: Pick<TenantSettings, 'checkOutTime'>
): string | null {
  const trimmed = settings.checkOutTime?.trim();
  if (!trimmed || !isValidTimeValue(trimmed)) return null;
  return trimmed;
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
  const occupiedBedCount = allEntries.filter((entry) => entry.status === 'occupied').length;
  const policy = guestAccessCheckInPolicyFromSettings(settings);

  const expectedToday: GuestStayRecordWithLink[] = [];
  const stillExpected: GuestStayRecordWithLink[] = [];
  const noShow: GuestStayRecordWithLink[] = [];
  const unpaid: GuestStayRecordWithLink[] = [];
  const keyNotIssued: GuestStayRecordWithLink[] = [];
  const departures: GuestStayRecordWithLink[] = [];

  for (const stay of stays) {
    const bucket = classifyReceptionHubStay(stay, {
      operationalDate,
      now,
      operationalDayStartTime,
      policy,
    });
    if (bucket === 'expectedToday') expectedToday.push(stay);
    else if (bucket === 'stillExpected') stillExpected.push(stay);
    else if (bucket === 'noShow') noShow.push(stay);

    if (isDepartureDeskStay(stay, operationalDate)) {
      departures.push(stay);
    }

    if (!isOperationalNightDeskStay(stay, operationalDate)) continue;

    if (stay.stay_kind !== 'volunteer' && !stay.booking_paid_at) {
      unpaid.push(stay);
    }
    if (hasGuestArrivedAtReception(stay) && !stay.key_issued_at) {
      keyNotIssued.push(stay);
    }
  }

  const checkOutTimeLabel = resolveCheckOutTimeLabel(settings);
  const departurePhase = resolveDeparturesSectionPhase(
    departures.map((stay) =>
      resolveDepartureSectionPhase({
        now,
        checkOutTime: checkOutTimeLabel,
        checkOutDate: stayRecordCheckOutDate(stay),
      })
    )
  );

  return {
    operationalDayStartTime,
    operational,
    expectedToday: sortByCheckIn(expectedToday),
    stillExpected: sortByCheckIn(stillExpected),
    noShow: sortByCheckIn(noShow),
    unpaid: sortByCheckIn(unpaid),
    keyNotIssued: sortByCheckIn(keyNotIssued),
    departures: sortByCheckIn(departures),
    departurePhase,
    checkOutTimeLabel,
    freeBedEntries,
    occupiedBedCount,
    orphanStays: sortByCheckIn(inventory.orphanStays),
  };
}
