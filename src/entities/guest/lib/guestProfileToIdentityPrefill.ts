import type { GuestIdentityFields, GuestProfile } from '../model/types';

/** Identity snapshot suitable for tourism prefill when profile is complete. */
export function guestProfileToIdentityPrefill(guest: GuestProfile): GuestIdentityFields | null {
  if (
    !guest.first_name?.trim() ||
    !guest.last_name?.trim() ||
    !guest.citizenship?.trim() ||
    !guest.passport_number?.trim() ||
    !guest.date_of_birth?.trim() ||
    !guest.country_of_birth?.trim() ||
    !guest.place_of_birth?.trim() ||
    !guest.gender ||
    !guest.document_type
  ) {
    return null;
  }
  return {
    firstName: guest.first_name.trim(),
    lastName: guest.last_name.trim(),
    citizenship: guest.citizenship.trim(),
    passportNumber: guest.passport_number.trim(),
    dateOfBirth: guest.date_of_birth.trim(),
    countryOfBirth: guest.country_of_birth.trim(),
    placeOfBirth: guest.place_of_birth.trim(),
    gender: guest.gender,
    documentType: guest.document_type,
  };
}
