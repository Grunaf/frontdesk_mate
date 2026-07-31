import { stayRecordCheckOutDate } from '@/entities/guest-stay';

export type StayCancelCheckoutIntent = 'cancel' | 'checkout';

export type StayCancelCheckoutFields = {
  passport_checked_at?: string | null;
  desk_checked_in_at?: string | null;
  check_out_date?: string | null;
  check_out_at: string;
  operationalDate: string;
  is_archived?: boolean;
  /** Volunteer stays end only from Owner portal Volunteers. */
  stay_kind?: 'guest' | 'volunteer' | null;
};

function isAdmitted(input: Pick<StayCancelCheckoutFields, 'passport_checked_at' | 'desk_checked_in_at'>): boolean {
  return Boolean(input.desk_checked_in_at);
}

/** Calendar past exclusive check-out; desk has not archived yet. */
export function isStayCheckoutOverdue(
  input: Pick<
    StayCancelCheckoutFields,
    | 'passport_checked_at'
    | 'desk_checked_in_at'
    | 'check_out_date'
    | 'check_out_at'
    | 'operationalDate'
    | 'is_archived'
    | 'stay_kind'
  >
): boolean {
  if (input.is_archived) return false;
  if (input.stay_kind === 'volunteer') return false;
  if (!isAdmitted(input)) return false;
  return input.operationalDate >= stayRecordCheckOutDate(input);
}

/**
 * Desk CTA for ending a booking:
 * - Cancel when not admitted
 * - Check out when admitted (including overdue after calendar end, until archived)
 * - null when archived or volunteer
 */
export function resolveStayCancelCheckoutAction(
  input: StayCancelCheckoutFields
): StayCancelCheckoutIntent | null {
  if (input.is_archived) return null;
  if (input.stay_kind === 'volunteer') return null;

  if (isAdmitted(input)) {
    return 'checkout';
  }

  return 'cancel';
}
