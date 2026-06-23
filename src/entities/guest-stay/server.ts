import 'server-only';

export {
  activateGuestStay,
  activateGuestStayByPin,
  createGuestStay,
  listActiveGuestStays,
  reissueGuestStay,
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
  ReissueGuestStayResult,
  ResolvedGuestSession,
} from './model/types';
