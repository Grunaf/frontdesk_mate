import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { addStayCalendarDays, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';
import { isCurrencyCode, type CurrencyCode } from '@/shared/lib/currency';
import type { TenantSettings } from '@/entities/tenant';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import { hasGuestArrivedAtReception } from './resolveReceptionHubSnapshot';
import {
  resolveOperationalDay,
  resolveOperationalDayStartTime,
  type OperationalDayWindow,
} from './resolveOperationalDay';

export type ReceptionCashStillDueItem = {
  stay: GuestStayRecordWithLink;
  amountMinor: number | null;
  currency: CurrencyCode | null;
  hasPrice: boolean;
  admitted: boolean;
  /** Last night before exclusive checkout = current operational day. */
  leavesTomorrow: boolean;
};

export type ReceptionCashSnapshot = {
  operationalDayStartTime: string;
  operational: OperationalDayWindow;
  currency: CurrencyCode;
  collectedMinor: number;
  stillDueMinor: number;
  expectedTotalMinor: number;
  paidTodayCount: number;
  unpaidCount: number;
  /** Unpaid still-due items whose checkout is tomorrow. */
  leavesTomorrowCount: number;
  stillToCollect: ReceptionCashStillDueItem[];
};

function resolveStayDueAmount(
  stay: GuestStayRecordWithLink
): { amountMinor: number; currency: CurrencyCode } | null {
  const minor = stay.booking_amount_due_minor;
  const currency = stay.booking_amount_currency;
  if (minor == null || !currency || !isCurrencyCode(currency)) {
    return null;
  }
  return { amountMinor: minor, currency };
}

function isUnpaidOperationalNightStay(
  stay: GuestStayRecordWithLink,
  operationalDate: string
): boolean {
  if (stay.stay_kind === 'volunteer') return false;
  if (stay.is_archived || stay.revoked_at) return false;
  if (!guestStayCoversNight(stay, operationalDate)) return false;
  return !stay.booking_paid_at;
}

export function isUnpaidLeavesTomorrow(
  stay: GuestStayRecordWithLink,
  operationalDate: string
): boolean {
  const checkOutDate = stayRecordCheckOutDate(stay);
  const lastNight = addStayCalendarDays(checkOutDate, -1);
  return lastNight === operationalDate;
}

function isPaidInOperationalWindow(
  stay: GuestStayRecordWithLink,
  operational: OperationalDayWindow
): boolean {
  if (!stay.booking_paid_at) return false;
  const paidAt = new Date(stay.booking_paid_at).getTime();
  if (!Number.isFinite(paidAt)) return false;
  return (
    paidAt >= operational.startsAt.getTime() && paidAt < operational.endsAt.getTime()
  );
}

function compareStillDueItems(a: ReceptionCashStillDueItem, b: ReceptionCashStillDueItem): number {
  if (a.leavesTomorrow !== b.leavesTomorrow) {
    return a.leavesTomorrow ? -1 : 1;
  }
  if (a.admitted !== b.admitted) {
    return a.admitted ? -1 : 1;
  }
  const aIn = a.stay.check_in_at;
  const bIn = b.stay.check_in_at;
  if (aIn !== bIn) {
    return aIn < bIn ? -1 : 1;
  }
  const aName = a.stay.guest_name?.trim() || '';
  const bName = b.stay.guest_name?.trim() || '';
  return aName.localeCompare(bName);
}

/**
 * Cash desk snapshot for the current operational day.
 * Unpaid cohort matches hub `unpaid` (covers operational night, not paid).
 * Collected = amounts marked paid within [startsAt, endsAt).
 */
export function resolveReceptionCashSnapshot(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[],
  now: Date = new Date()
): ReceptionCashSnapshot {
  const operationalDayStartTime = resolveOperationalDayStartTime(settings);
  const operational = resolveOperationalDay(now, operationalDayStartTime);
  const currency = resolveTenantCurrency(settings).primary;
  const { operationalDate } = operational;

  let collectedMinor = 0;
  let paidTodayCount = 0;
  const stillToCollect: ReceptionCashStillDueItem[] = [];

  for (const stay of stays) {
    if (isPaidInOperationalWindow(stay, operational)) {
      paidTodayCount += 1;
      const due = resolveStayDueAmount(stay);
      if (due && due.currency === currency) {
        collectedMinor += due.amountMinor;
      }
    }

    if (!isUnpaidOperationalNightStay(stay, operationalDate)) {
      continue;
    }

    const due = resolveStayDueAmount(stay);
    stillToCollect.push({
      stay,
      amountMinor: due?.amountMinor ?? null,
      currency: due?.currency ?? null,
      hasPrice: Boolean(due),
      admitted: hasGuestArrivedAtReception(stay),
      leavesTomorrow: isUnpaidLeavesTomorrow(stay, operationalDate),
    });
  }

  stillToCollect.sort(compareStillDueItems);

  const stillDueMinor = stillToCollect.reduce((sum, item) => {
    if (!item.hasPrice || item.amountMinor == null) return sum;
    if (item.currency !== currency) return sum;
    return sum + item.amountMinor;
  }, 0);

  return {
    operationalDayStartTime,
    operational,
    currency,
    collectedMinor,
    stillDueMinor,
    expectedTotalMinor: collectedMinor + stillDueMinor,
    paidTodayCount,
    unpaidCount: stillToCollect.length,
    leavesTomorrowCount: stillToCollect.filter((item) => item.leavesTomorrow).length,
    stillToCollect,
  };
}
