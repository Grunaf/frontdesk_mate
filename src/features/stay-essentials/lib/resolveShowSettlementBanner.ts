import {
  isSettlementBannerClosed,
  type SettlementBannerProgressInput,
} from './resolveSettlementBannerProgress';
import { isStayCheckInCalendarDayOrLater } from '@/entities/guest-stay';

export function isCheckInDayOrLater(
  checkInAt: string,
  now = new Date(),
  propertyTimeZone?: string | null
): boolean {
  return isStayCheckInCalendarDayOrLater(checkInAt, now, propertyTimeZone);
}

export type ResolveShowSettlementBannerInput = {
  isRegistered: boolean;
  tenantSlug: string | null | undefined;
  stayId: string | null | undefined;
  checkInAt: string | null | undefined;
  propertyTimeZone?: string | null;
  settlementProgress: SettlementBannerProgressInput;
  now?: Date;
};

/** Check-in calendar night+ (property-local): settlement banner replaces pre-check-in registration banner. */
export function resolveShowSettlementBanner(input: ResolveShowSettlementBannerInput): boolean {
  if (!input.isRegistered) {
    return false;
  }

  if (!input.tenantSlug?.trim() || !input.stayId?.trim()) {
    return false;
  }

  const now = input.now ?? new Date();
  if (
    !input.checkInAt?.trim() ||
    !isCheckInDayOrLater(input.checkInAt, now, input.propertyTimeZone)
  ) {
    return false;
  }

  return !isSettlementBannerClosed(input.settlementProgress);
}

export type ResolveShowPreCheckInRegistrationBannerInput = {
  isRegistered: boolean;
  tenantSlug: string | null | undefined;
  checkInAt: string | null | undefined;
  propertyTimeZone?: string | null;
  registrationComplete: boolean;
  now?: Date;
};

/** Before check-in calendar night only; on check-in night+ settlement banner takes priority. */
export function resolveShowPreCheckInRegistrationBanner(
  input: ResolveShowPreCheckInRegistrationBannerInput
): boolean {
  if (!input.isRegistered || !input.tenantSlug?.trim()) {
    return false;
  }

  if (input.registrationComplete) {
    return false;
  }

  const now = input.now ?? new Date();
  if (
    input.checkInAt?.trim() &&
    isCheckInDayOrLater(input.checkInAt, now, input.propertyTimeZone)
  ) {
    return false;
  }

  return true;
}
