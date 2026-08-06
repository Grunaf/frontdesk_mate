import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { canEditReceptionStayOccupancy, isReceptionStayPastCheckOut } from './canEditReceptionStayOccupancy';
import { isPlanStayAdmitted, isPlanStayUnpaid } from './resolvePlanStayCalendarPresentation';
import { resolveStayCancelCheckoutAction } from './resolveStayCancelCheckoutAction';

export type PlanStayQuickActionId =
  | 'open'
  | 'checkIn'
  | 'checkOut'
  | 'takePayment'
  | 'moveBed'
  | 'extend'
  | 'editBooking'
  | 'cancelBooking';

export type PlanStayQuickAction = {
  id: PlanStayQuickActionId;
  label: string;
  /** Destructive styling for cancel. */
  destructive?: boolean;
};

const LABELS: Record<PlanStayQuickActionId, string> = {
  open: 'Open',
  checkIn: 'Check in',
  checkOut: 'Check out',
  takePayment: 'Take payment',
  moveBed: 'Move bed',
  extend: 'Extend stay',
  editBooking: 'Edit booking',
  cancelBooking: 'Cancel booking',
};

/**
 * Ordered quick actions for Plan long-press / right-click menus.
 * Hidden when unavailable — never a disabled graveyard.
 */
export function resolvePlanStayQuickActions(input: {
  stay: GuestStayRecordWithLink;
  /** Party balance carrier (or the stay itself). Used for Take payment. */
  balanceStay: GuestStayRecordWithLink;
  operationalDate: string;
  canEditPastStays: boolean;
}): PlanStayQuickAction[] {
  const { stay, balanceStay, operationalDate, canEditPastStays } = input;
  const stayEnded = isReceptionStayPastCheckOut(stay, operationalDate);
  const canEditOccupancy = canEditReceptionStayOccupancy({
    stayEnded,
    canEditPastStays,
  });
  const admitted = isPlanStayAdmitted(stay);
  const endAction = resolveStayCancelCheckoutAction({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
    stay_kind: stay.stay_kind,
  });

  const actions: PlanStayQuickAction[] = [{ id: 'open', label: LABELS.open }];

  if (!admitted && !stayEnded && !stay.is_archived) {
    actions.push({ id: 'checkIn', label: LABELS.checkIn });
  }

  if (endAction === 'checkout') {
    actions.push({ id: 'checkOut', label: LABELS.checkOut });
  }

  if (isPlanStayUnpaid(balanceStay)) {
    actions.push({ id: 'takePayment', label: LABELS.takePayment });
  }

  if (canEditOccupancy) {
    actions.push({ id: 'moveBed', label: LABELS.moveBed });
  }

  if (stay.stay_kind !== 'volunteer' && !stay.is_archived) {
    actions.push({ id: 'extend', label: LABELS.extend });
  }

  if (canEditOccupancy) {
    actions.push({ id: 'editBooking', label: LABELS.editBooking });
  }

  if (endAction === 'cancel') {
    actions.push({
      id: 'cancelBooking',
      label: LABELS.cancelBooking,
      destructive: true,
    });
  }

  return actions;
}

/** Balance stay for party payment — same rule as stay detail. */
export function resolvePlanStayBalanceStay(
  stay: GuestStayRecordWithLink,
  planStays: GuestStayRecordWithLink[]
): GuestStayRecordWithLink {
  const groupId = stay.booking_group_id?.trim();
  const party = groupId
    ? planStays.filter((entry) => entry.booking_group_id === groupId)
    : [stay];
  return (
    party.find(
      (member) => member.booking_amount_due_minor != null && member.booking_amount_currency
    ) ?? stay
  );
}
