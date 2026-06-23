export { buildGuestMagicLinkUrl, appendGuestEntryToMagicLink } from './lib/buildMagicLinkUrl';
export { bedExistsInGuestStay, listGuestStayBedIds } from './lib/validateBedForTenant';
export { formatStayReference } from './lib/formatStayReference';
export { findStayByReference, normalizeStayReferenceQuery } from './lib/findStayByReference';
export type { GuestSessionPayload, GuestStayRecord, GuestStayRecordWithLink, ResolvedGuestSession } from './model/types';
