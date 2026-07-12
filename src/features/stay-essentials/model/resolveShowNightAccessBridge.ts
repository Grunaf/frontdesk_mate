import type { TenantSettings } from '@/entities/tenant';
import {
  isStayCheckInCalendarDay,
  isWithinStayArrivalCalendarWindow,
  propertyLocalMinutesSinceMidnight,
} from '@/entities/guest-stay';

export function isWithinArrivalWindow(
  checkInAt: string | null | undefined,
  now = new Date(),
  propertyTimeZone?: string | null
): boolean {
  return isWithinStayArrivalCalendarWindow(checkInAt, now, propertyTimeZone);
}

function parseHoursMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function isAfterReceptionClose(
  receptionClose: string | undefined,
  now: Date,
  propertyTimeZone?: string | null
): boolean {
  const closeMinutes = receptionClose ? parseHoursMinutes(receptionClose) : null;
  if (closeMinutes === null) {
    return false;
  }

  const nowMinutes = propertyLocalMinutesSinceMidnight(now, propertyTimeZone);
  return nowMinutes > closeMinutes;
}

function isKeyNotIssued(keyIssuedAt: string | null | undefined): boolean {
  return !keyIssuedAt;
}

export interface ResolveShowNightAccessBridgeInput {
  settings: TenantSettings;
  checkInAt: string | null;
  isNightMode: boolean;
  isRegistered: boolean;
  nightAccessEnabled: boolean;
  hasNightDoorCodes: boolean;
  keyIssuedAt?: string | null;
  nightAccessDismissed: boolean;
  now?: Date;
}

export function resolveShowNightAccessBridge(input: ResolveShowNightAccessBridgeInput): boolean {
  const now = input.now ?? new Date();
  const propertyTimeZone = input.settings.propertyTimeZone;

  if (!input.isRegistered) {
    return false;
  }

  if (!input.nightAccessEnabled) {
    return false;
  }

  if (!input.hasNightDoorCodes) {
    return false;
  }

  if (!input.checkInAt || !isWithinArrivalWindow(input.checkInAt, now, propertyTimeZone)) {
    return false;
  }

  const nightContext =
    input.isNightMode ||
    (isStayCheckInCalendarDay(input.checkInAt, now, propertyTimeZone) &&
      isAfterReceptionClose(input.settings.reception?.close, now, propertyTimeZone));

  if (!nightContext) {
    return false;
  }

  if (!isKeyNotIssued(input.keyIssuedAt)) {
    return false;
  }

  if (input.nightAccessDismissed) {
    return false;
  }

  return true;
}
