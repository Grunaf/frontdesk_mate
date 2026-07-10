export { buildGuestMagicLinkUrl, appendGuestEntryToMagicLink } from './lib/buildMagicLinkUrl';
export { bedExistsInGuestStay, listGuestStayBedIds } from './lib/validateBedForTenant';
export { formatStayReference } from './lib/formatStayReference';
export {
  addStayCalendarDays,
  compareStayCalendarDays,
  formatStayCalendarDayLabel,
  isStayCheckInCalendarDay,
  isStayCheckInCalendarDayOrLater,
  isWithinStayArrivalCalendarWindow,
  stayCalendarDay,
  todayStayCalendarDay,
} from './lib/stayCalendarDay';
export { findStayByReference, normalizeStayReferenceQuery } from './lib/findStayByReference';
export type { GuestSessionPayload, GuestStayRecord, GuestStayRecordWithLink, ResolvedGuestSession } from './model/types';
