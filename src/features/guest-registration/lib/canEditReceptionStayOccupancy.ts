import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckOutDate } from '@/entities/guest-stay';

/** Past exclusive check-out day or archived — block live mutate (edit/grant/tourism/reissue). */
export function isReceptionStayPastCheckOut(
  stay: Pick<GuestStayRecordWithLink, 'is_archived' | 'check_out_date' | 'check_out_at'>,
  operationalDate: string
): boolean {
  return Boolean(stay.is_archived) || operationalDate >= stayRecordCheckOutDate(stay);
}

/**
 * Edit dates / bed / booking fields: live stays always; ended only with past-edit permission.
 * Does not unlock grant / tourism / reissue.
 */
export function canEditReceptionStayOccupancy(input: {
  stayEnded: boolean;
  canEditPastStays: boolean;
}): boolean {
  return !input.stayEnded || input.canEditPastStays;
}
