export { buildGuestMagicLinkUrl, appendGuestEntryToMagicLink } from './lib/buildMagicLinkUrl';
export { bedExistsInGuestStay, listGuestStayBedIds } from './lib/validateBedForTenant';
export { formatStayReference } from './lib/formatStayReference';
export {
  DEFAULT_PROPERTY_TIME_ZONE,
  formatPropertyLocalCheckInIso,
  isStayCheckInInstantOrLater,
  isStayCheckInStarted,
  isValidPropertyTimeZone,
  normalizePropertyTimeZone,
  propertyLocalDateTimeToUtcMs,
  resolveStayCheckInInstantMs,
  resolveStayCheckInTimeLabel,
} from './lib/stayCheckInMoment';
export {
  addStayCalendarDays,
  compareStayCalendarDays,
  formatStayCalendarDayLabel,
  isStayCheckInCalendarDay,
  isStayCheckInCalendarDayOrLater,
  isWithinStayArrivalCalendarWindow,
  stayCalendarDay,
  todayStayCalendarDay,
  todayPropertyStayCalendarDay,
  propertyLocalMinutesSinceMidnight,
} from './lib/stayCalendarDay';
export {
  resolveReservationStayPeriod,
  stayRecordCheckInDate,
  stayRecordCheckOutDate,
} from './lib/resolveReservationStayPeriod';
export type { ReservationStayPeriod } from './lib/resolveReservationStayPeriod';
export type { GuestSessionPayload, GuestStayKind, GuestStayRecord, GuestStayRecordWithLink, GuestReservationArchiveListItem, GuestReservationTrashListItem, ResolvedGuestSession } from './model/types';
