import 'server-only';

export {
  activateGuestStay,
  activateGuestStayByPin,
  createGuestStay,
  listActiveGuestStays,
  resolveGuestSessionFromCookies,
  revokeGuestStay,
} from './api/guestStayRepository';
export {
  clearGuestSessionCookie,
  readGuestSessionFromCookies,
  setGuestSessionCookie,
} from './lib/guestSession';
export type {
  ActivateGuestStayByPinResult,
  ActivateGuestStayResult,
  CreateGuestStayResult,
  GuestSessionPayload,
  GuestStayRecord,
  GuestStayRecordWithLink,
  ResolvedGuestSession,
} from './model/types';
