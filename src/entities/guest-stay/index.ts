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
export { findStayByReference, normalizeStayReferenceQuery } from './lib/findStayByReference';
export type { GuestSessionPayload, GuestStayRecord, GuestStayRecordWithLink, ResolvedGuestSession } from './model/types';
