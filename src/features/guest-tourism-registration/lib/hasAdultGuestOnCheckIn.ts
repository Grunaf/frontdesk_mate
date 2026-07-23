import { isUnderageOnCheckIn } from './validateTourismGuestIdentity';

/** True if at least one guest is 18+ on the stay check-in day. */
export function hasAdultGuestOnCheckIn(
  guests: Array<{ dateOfBirth: string }>,
  checkInDate: string
): boolean {
  if (!checkInDate.trim()) return false;
  return guests.some(
    (guest) =>
      Boolean(guest.dateOfBirth?.trim()) &&
      !isUnderageOnCheckIn(guest.dateOfBirth, checkInDate)
  );
}
