'use client';

import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  isStayCheckoutOverdue,
  resolveStayCancelCheckoutAction,
} from '../lib/resolveStayCancelCheckoutAction';
import type { StayDetailTabBadgeTone } from '../lib/resolveStayDetailTabBadge';
import { isReceptionStayPastCheckOut } from './useStayAccessControls';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { EllipsisVertical } from 'lucide-react';

export function StayDetailTabToneDot({ tone }: { tone: StayDetailTabBadgeTone }) {
  if (tone === 'none') return null;
  return (
    <span
      aria-hidden
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        tone === 'amber' && 'bg-amber-500',
        tone === 'emerald' && 'bg-emerald-500',
        tone === 'muted' && 'bg-muted-foreground/50'
      )}
    />
  );
}
export function ReceptionGuestStayDetailActions({
  stay,
  isPending,
  onCancelOrCheckout,
  operationalDate,
  showAddTourismGuest,
  onAddTourismGuest,
  addTourismGuestDisabled,
  showCheckIn,
  onCheckIn,
  checkInDisabled,
  checkInHint,
  checkInError,
  showGrantAccess,
  onGrantAccess,
  grantAccessDisabled,
}: {
  stay: GuestStayRecordWithLink;
  isPending: boolean;
  onCancelOrCheckout: (stayId: string, intent: 'cancel' | 'checkout') => void;
  operationalDate: string;
  showAddTourismGuest: boolean;
  onAddTourismGuest: () => void;
  addTourismGuestDisabled: boolean;
  showCheckIn: boolean;
  onCheckIn: () => void;
  checkInDisabled: boolean;
  checkInHint: string | null;
  checkInError: string | null;
  showGrantAccess: boolean;
  onGrantAccess: () => void;
  grantAccessDisabled: boolean;
}) {
  const endAction = resolveStayCancelCheckoutAction({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
    stay_kind: stay.stay_kind,
  });

  const overdueCheckout = isStayCheckoutOverdue({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
    stay_kind: stay.stay_kind,
  });
  const showCheckout = endAction === 'checkout';
  const busy = isPending;

  return (
    <div className="flex flex-col gap-2">
      {showGrantAccess ? (
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full"
          disabled={busy || grantAccessDisabled}
          onClick={onGrantAccess}
        >
          Grant access
        </Button>
      ) : null}

      {showAddTourismGuest ? (
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full"
          disabled={busy || addTourismGuestDisabled}
          onClick={onAddTourismGuest}
        >
          Add guest
        </Button>
      ) : null}

      {showCheckIn ? (
        <>
          {checkInHint ? <p className="text-xs text-muted-foreground">{checkInHint}</p> : null}
          {checkInError ? <p className="text-xs text-destructive">{checkInError}</p> : null}
          <Button
            type="button"
            size="default"
            className="w-full"
            disabled={busy || checkInDisabled}
            onClick={onCheckIn}
          >
            Check in
          </Button>
        </>
      ) : null}

      {showCheckout ? (
        <Button
          type="button"
          variant="destructive"
          size="default"
          className="w-full"
          disabled={busy}
          onClick={() => onCancelOrCheckout(stay.id, 'checkout')}
        >
          {overdueCheckout ? 'Confirm checkout' : 'Check out'}
        </Button>
      ) : null}
    </div>
  );
}

export function ReceptionGuestStayDetailOverflowMenu({
  stay,
  isPending,
  onCancelOrCheckout,
  onReissueAccess,
  onExtendStay,
  operationalDate,
  accessGranted,
  accessPending,
  onRevokeAccess,
}: {
  stay: GuestStayRecordWithLink;
  isPending: boolean;
  onCancelOrCheckout: (stayId: string, intent: 'cancel' | 'checkout') => void;
  onReissueAccess: (stay: GuestStayRecordWithLink) => void;
  onExtendStay: (stay: GuestStayRecordWithLink) => void;
  operationalDate: string;
  accessGranted: boolean;
  accessPending: boolean;
  onRevokeAccess: () => void;
}) {
  const endAction = resolveStayCancelCheckoutAction({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
    stay_kind: stay.stay_kind,
  });

  const pastCheckOut = isReceptionStayPastCheckOut(stay, operationalDate);
  const overdueCheckout = isStayCheckoutOverdue({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
    stay_kind: stay.stay_kind,
  });
  const showCancel = endAction === 'cancel';
  const showReissue = !pastCheckOut;
  const showRevoke = accessGranted && (!pastCheckOut || overdueCheckout);
  const busy = isPending || accessPending;
  const showExtend = stay.stay_kind !== 'volunteer' && !stay.is_archived;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={busy}>
          <EllipsisVertical />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showReissue ? (
          <DropdownMenuItem disabled={busy} onSelect={() => onReissueAccess(stay)}>
            Reissue access
          </DropdownMenuItem>
        ) : null}
        {showExtend ? (
          <DropdownMenuItem disabled={busy} onSelect={() => onExtendStay(stay)}>
            Extend stay
          </DropdownMenuItem>
        ) : null}
        {showRevoke ? (
          <DropdownMenuItem disabled={busy} onSelect={onRevokeAccess}>
            Revoke access
          </DropdownMenuItem>
        ) : null}
        {showCancel ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onSelect={() => onCancelOrCheckout(stay.id, 'cancel')}
          >
            Cancel booking
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
