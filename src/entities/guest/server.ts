import 'server-only';

export {
  createGuestProfile,
  getGuestById,
  resolveGuestIdForBooking,
  searchGuests,
  updateGuestIdentity,
} from './api/guestRepository';
export type {
  CreateGuestProfileInput,
  CreateGuestProfileResult,
  GuestDocumentType,
  GuestGender,
  GuestIdentityFields,
  GuestProfile,
  SearchGuestsInput,
  SearchGuestsResult,
  UpdateGuestIdentityInput,
  UpdateGuestIdentityResult,
} from './model/types';
export { formatGuestDisplayName } from './lib/formatGuestDisplayName';
export { guestProfileToIdentityPrefill } from './lib/guestProfileToIdentityPrefill';
