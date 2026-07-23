import { isKnownCitizenshipCode } from './citizenshipOptions';

export type TourismGuestGender = 'male' | 'female';

export type TourismGuestDocumentType = 'passport' | 'id_card';

const MAX_PLACE_OF_BIRTH_LENGTH = 120;

/** Passport / ID card numbers: letters and digits only (no spaces or punctuation). */
export const PASSPORT_NUMBER_PATTERN = /^[A-Za-z0-9]+$/;

export function normalizePassportNumber(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidPassportNumber(raw: string): boolean {
  const normalized = normalizePassportNumber(raw);
  return normalized.length > 0 && PASSPORT_NUMBER_PATTERN.test(normalized);
}

export function isValidGender(raw: string): raw is TourismGuestGender {
  return raw === 'male' || raw === 'female';
}

export function isValidDocumentType(raw: string): raw is TourismGuestDocumentType {
  return raw === 'passport' || raw === 'id_card';
}

export function isValidCitizenship(raw: string): boolean {
  const code = raw.trim().toUpperCase();
  return code.length === 2 && isKnownCitizenshipCode(code);
}

export function isValidCountryOfBirth(raw: string): boolean {
  return isValidCitizenship(raw);
}

export function isValidPlaceOfBirth(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_PLACE_OF_BIRTH_LENGTH;
}

export function normalizePlaceOfBirth(raw: string): string {
  return raw.trim();
}

export function isValidDateOfBirth(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [y, m, d] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m! - 1 &&
    date.getUTCDate() === d
  );
}

/** Age in full years on `onDate` (YYYY-MM-DD). Null if either date is invalid. */
export function ageOnDate(dateOfBirth: string, onDate: string): number | null {
  if (!isValidDateOfBirth(dateOfBirth) || !isValidDateOfBirth(onDate)) {
    return null;
  }
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [oy, om, od] = onDate.split('-').map(Number);
  let age = oy! - by!;
  if (om! < bm! || (om === bm && od! < bd!)) {
    age -= 1;
  }
  return age;
}

/** Warning-only: guest is under 18 on the stay check-in calendar day. */
export function isUnderageOnCheckIn(dateOfBirth: string, checkInDate: string): boolean {
  const age = ageOnDate(dateOfBirth, checkInDate);
  return age !== null && age < 18;
}
