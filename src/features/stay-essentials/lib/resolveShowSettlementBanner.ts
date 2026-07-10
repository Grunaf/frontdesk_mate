import {
  isSettlementBannerClosed,
  type SettlementBannerProgressInput,
} from './resolveSettlementBannerProgress';

/** Calendar days use the browser local timezone (property IANA TZ not in settings v1). */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isCheckInDayOrLater(checkInAt: string, now = new Date()): boolean {
  const checkInDate = startOfLocalDay(new Date(checkInAt));
  if (!Number.isFinite(checkInDate.getTime())) {
    return false;
  }

  const today = startOfLocalDay(now);
  return today.getTime() >= checkInDate.getTime();
}

export type ResolveShowSettlementBannerInput = {
  isRegistered: boolean;
  tenantSlug: string | null | undefined;
  stayId: string | null | undefined;
  checkInAt: string | null | undefined;
  settlementProgress: SettlementBannerProgressInput;
  now?: Date;
};

/** Check-in day+: settlement banner replaces pre-check-in registration banner. */
export function resolveShowSettlementBanner(input: ResolveShowSettlementBannerInput): boolean {
  if (!input.isRegistered) {
    return false;
  }

  if (!input.tenantSlug?.trim() || !input.stayId?.trim()) {
    return false;
  }

  if (!input.checkInAt?.trim() || !isCheckInDayOrLater(input.checkInAt, input.now)) {
    return false;
  }

  return !isSettlementBannerClosed(input.settlementProgress);
}

export type ResolveShowPreCheckInRegistrationBannerInput = {
  isRegistered: boolean;
  tenantSlug: string | null | undefined;
  checkInAt: string | null | undefined;
  registrationComplete: boolean;
  now?: Date;
};

/** Before check-in day only; on check-in day+ settlement banner takes priority. */
export function resolveShowPreCheckInRegistrationBanner(
  input: ResolveShowPreCheckInRegistrationBannerInput
): boolean {
  if (!input.isRegistered || !input.tenantSlug?.trim()) {
    return false;
  }

  if (input.registrationComplete) {
    return false;
  }

  if (input.checkInAt?.trim() && isCheckInDayOrLater(input.checkInAt, input.now)) {
    return false;
  }

  return true;
}
