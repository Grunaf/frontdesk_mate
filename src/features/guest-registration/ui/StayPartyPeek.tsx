'use client';

import { useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { formatReservationBookingBalanceSummary } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import { setGuestReservationBookingPaidAction } from '../actions/receptionActions';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

function isStayAdmitted(stay: GuestStayRecordWithLink): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

export function StayPartyBalanceControls({
  balanceStay,
  tenantSlug,
  onStayUpdated,
}: {
  balanceStay: GuestStayRecordWithLink;
  tenantSlug: string;
  onStayUpdated?: (stay: GuestStayRecordWithLink) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();

  const summary = formatReservationBookingBalanceSummary(balanceStay);
  const hasBalance =
    balanceStay.booking_amount_due_minor != null && balanceStay.booking_amount_currency;
  const isPaid = Boolean(balanceStay.booking_paid_at);

  const handleTogglePaid = () => {
    startAction(async () => {
      setActionError(null);
      const result = await setGuestReservationBookingPaidAction({
        tenantSlug,
        stayId: balanceStay.id,
        paid: !isPaid,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'no_balance_recorded'
            ? 'No stay balance recorded.'
            : result.error === 'unauthorized'
              ? 'Sign in again at reception desk.'
              : 'Could not update payment status.'
        );
        return;
      }

      onStayUpdated?.({
        ...balanceStay,
        ...result.stay,
        magicLinkUrl: balanceStay.magicLinkUrl,
      });
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Party balance
      </p>
      <p className="text-sm">{hasBalance && summary ? summary : 'No party balance'}</p>
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      {hasBalance ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          disabled={isPending}
          onClick={handleTogglePaid}
        >
          {isPaid ? 'Mark unpaid' : 'Mark paid'}
        </Button>
      ) : null}
    </div>
  );
}

export type StayPartyPeekProps = {
  partyStays: GuestStayRecordWithLink[];
  activeStayId: string;
  balanceStay: GuestStayRecordWithLink;
  resolveBedLabel: (bedId: string) => string;
  onSelectStay: (stayId: string) => void;
  tenantSlug?: string;
  onStayBookingBalanceChange?: (stay: GuestStayRecordWithLink) => void;
  showCheckInParty: boolean;
  checkInPartyDisabled?: boolean;
  checkInPartyPending?: boolean;
  checkInPartyHint?: string | null;
  checkInPartyError?: string | null;
  onCheckInParty: () => void;
};

export function StayPartyPeek({
  partyStays,
  activeStayId,
  balanceStay,
  resolveBedLabel,
  onSelectStay,
  tenantSlug,
  onStayBookingBalanceChange,
  showCheckInParty,
  checkInPartyDisabled = false,
  checkInPartyPending = false,
  checkInPartyHint = null,
  checkInPartyError = null,
  onCheckInParty,
}: StayPartyPeekProps) {
  if (partyStays.length <= 1) return null;

  const leadName =
    partyStays.find((member) => member.guest_name?.trim())?.guest_name?.trim() || 'Guest';
  const partyTitle = `${leadName}'s party`;

  return (
    <aside
      aria-label={partyTitle}
      className="flex h-full w-80 flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
    >
      <div className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3">
        <p className="truncate text-sm font-semibold text-foreground">{partyTitle}</p>
        <p className="text-xs text-muted-foreground">{partyStays.length} beds</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
        {tenantSlug ? (
          <StayPartyBalanceControls
            balanceStay={balanceStay}
            tenantSlug={tenantSlug}
            onStayUpdated={onStayBookingBalanceChange}
          />
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Beds
          </p>
          <ul className="space-y-1.5">
            {partyStays.map((member, index) => {
              const guestLabel = member.guest_name?.trim() || `Guest ${index + 1}`;
              const bedLabel = resolveBedLabel(member.bed_id);
              const ref = formatStayReference(member.id);
              const isActive = member.id === activeStayId;
              const admitted = isStayAdmitted(member);
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStay(member.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm',
                      isActive
                        ? 'border-primary/40 bg-primary/5'
                        : 'bg-card hover:bg-muted/40'
                    )}
                  >
                    <span className="min-w-0 truncate font-medium">
                      {guestLabel}
                      <span className="font-normal text-muted-foreground"> · {bedLabel}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {admitted ? (
                        <span className="text-emerald-700">In</span>
                      ) : (
                        <span>Expected</span>
                      )}
                      {ref ? <span className="font-mono">#{ref}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {showCheckInParty ? (
        <div className="shrink-0 space-y-2 border-t border-border/60 px-3 py-3">
          {checkInPartyHint ? (
            <p className="text-xs text-muted-foreground">{checkInPartyHint}</p>
          ) : null}
          {checkInPartyError ? (
            <p className="text-xs text-destructive">{checkInPartyError}</p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={checkInPartyDisabled || checkInPartyPending}
            onClick={onCheckInParty}
          >
            {checkInPartyPending ? 'Checking in…' : 'Check in party'}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
