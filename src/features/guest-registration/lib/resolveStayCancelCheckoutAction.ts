import { stayRecordCheckOutDate } from '@/entities/guest-stay';

export type StayCancelCheckoutIntent = 'cancel' | 'checkout';

/**
 * Desk CTA for ending a booking:
 * - Cancel when not admitted
 * - Check out when admitted and exclusive end is still after operational day
 * - null when already ended for tonight (e.g. shortened lived record after early checkout)
 */
export function resolveStayCancelCheckoutAction(input: {
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
  check_out_date?: string | null;
  check_out_at: string;
  operationalDate: string;
  is_archived?: boolean;
}): StayCancelCheckoutIntent | null {
  if (input.is_archived) return null;

  const admitted = Boolean(input.passport_checked_at || input.desk_checked_in_at);
  const checkOutDate = stayRecordCheckOutDate(input);

  if (admitted) {
    return input.operationalDate < checkOutDate ? 'checkout' : null;
  }

  return 'cancel';
}
