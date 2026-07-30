'use client';

import { useEffect, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import { formatReservationBookingBalanceSummary } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import { resolveBookingSourceOpenTarget } from '../lib/resolveBookingSourceOpenTarget';
import { formatReceptionDateTime } from '../lib/guestAccessDates';
import {
  setGuestReservationBookingPaidAction,
  setGuestReservationReceptionNoteAction,
  confirmGuestStayContactPhoneAction,
  rejectGuestStayContactPhoneAction,
} from '../actions/receptionActions';
import { BookingGroupIcon } from './BookingGroupIcon';
import { Button } from '@/shared/ui';
import { buildWhatsappMeHref } from '@/shared/lib';

export function StayBookingSourceOpenBlock({
  stay,
  tenantSettings,
}: {
  stay: GuestStayRecordWithLink;
  tenantSettings?: TenantSettings;
}) {
  const target = resolveBookingSourceOpenTarget({
    platformId: stay.booking_platform_id,
    externalId: stay.booking_external_id,
    tenantSettings,
  });

  if (!target) {
    return null;
  }

  const handleOpen = () => {
    if (!target.openUrl) return;
    window.open(target.openUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {target.label}
      </p>
      {target.referenceDisplay ? (
        <p className="text-sm font-mono">#{target.referenceDisplay}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No booking reference</p>
      )}
      {target.hint ? <p className="text-xs text-muted-foreground">{target.hint}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!target.openUrl}
        onClick={handleOpen}
      >
        {target.buttonLabel}
      </Button>
    </div>
  );
}
export function StayRoomKeyBlock({
  accessGranted,
  keyIssued,
  keyIssuedAt,
  isPending,
  actionError,
  readOnly = false,
  onToggle,
}: {
  accessGranted: boolean;
  keyIssued: boolean;
  keyIssuedAt: string | null;
  isPending: boolean;
  actionError: string | null;
  readOnly?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Room key
      </p>
      {!accessGranted ? (
        <p className="text-xs text-muted-foreground">Available after check-in</p>
      ) : keyIssued ? (
        <p className="text-sm">
          Key issued
          {keyIssuedAt ? ` · ${formatReceptionDateTime(keyIssuedAt)}` : ''}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Physical key / card not handed over yet.
        </p>
      )}
      {accessGranted && actionError && !readOnly ? (
        <p className="text-xs text-destructive">{actionError}</p>
      ) : null}
      {accessGranted && !readOnly ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={isPending}
          onClick={() => onToggle(!keyIssued)}
        >
          {keyIssued ? 'Mark not issued' : 'Mark key issued'}
        </Button>
      ) : null}
    </div>
  );
}

export function StayBookingBalanceBlock({
  stay,
  balanceStay,
  isPartySibling,
  tenantSlug,
  onStayUpdated,
}: {
  stay: GuestStayRecordWithLink;
  /** Row that holds booking_amount_* (lead for party). */
  balanceStay: GuestStayRecordWithLink;
  isPartySibling: boolean;
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

  if (!hasBalance) {
    if (isPartySibling) {
      return (
        <p className="text-xs text-muted-foreground">Included in party balance.</p>
      );
    }
    return (
      <p className="text-xs text-muted-foreground">No balance recorded for this stay.</p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {stay.booking_group_id ? 'Party balance' : 'Stay balance'}
      </p>
      <p className="text-sm">{summary}</p>
      {isPartySibling && balanceStay.id !== stay.id ? (
        <p className="text-xs text-muted-foreground">Shared with the party lead.</p>
      ) : null}
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={isPending}
        onClick={handleTogglePaid}
      >
        {isPaid ? 'Mark unpaid' : 'Mark as paid'}
      </Button>
    </div>
  );
}

export function isStayAdmitted(stay: GuestStayRecordWithLink): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

export function resolvePartyContactStay(
  partyStays: GuestStayRecordWithLink[]
): GuestStayRecordWithLink | null {
  if (partyStays.length === 0) return null;
  const sorted = [...partyStays].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const withContact = sorted.find(
    (member) =>
      Boolean(member.contact_phone?.trim()) ||
      Boolean(member.contact_phone_pending?.trim()) ||
      Boolean(member.contact_email?.trim())
  );
  return withContact ?? sorted[0] ?? null;
}

export function StayPartyChildBanner({
  partyTitle,
  onOpenParty,
}: {
  partyTitle: string;
  onOpenParty: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <BookingGroupIcon />
        <span className="truncate">Part of {partyTitle}</span>
      </p>
      <Button type="button" size="sm" variant="outline" className="h-7" onClick={onOpenParty}>
        View beds
      </Button>
    </div>
  );
}

const RECEPTION_NOTE_MAX_LENGTH = 1000;

export function StayReceptionNoteBlock({
  stay,
  tenantSlug,
  onStayUpdated,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  onStayUpdated?: (stay: GuestStayRecordWithLink) => void;
}) {
  const [draft, setDraft] = useState(stay.reception_note ?? '');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();
  const savedNote = stay.reception_note ?? '';
  const dirty = draft !== savedNote;

  useEffect(() => {
    setDraft(stay.reception_note ?? '');
    setActionError(null);
  }, [stay.id, stay.reception_note]);

  const handleSave = () => {
    startAction(async () => {
      setActionError(null);
      const result = await setGuestReservationReceptionNoteAction({
        tenantSlug,
        stayId: stay.id,
        note: draft,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'invalid_note'
            ? `Comment must be at most ${RECEPTION_NOTE_MAX_LENGTH} characters.`
            : result.error === 'unauthorized'
              ? 'Sign in again at reception desk.'
              : 'Could not save comment.'
        );
        return;
      }
      setDraft(result.stay.reception_note ?? '');
      onStayUpdated?.({
        ...stay,
        ...result.stay,
        magicLinkUrl: stay.magicLinkUrl,
      });
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Comment
      </p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        maxLength={RECEPTION_NOTE_MAX_LENGTH}
        disabled={isPending}
        placeholder="Desk-only note for this booking…"
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-2.5 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
      />
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={isPending || !dirty}
        onClick={handleSave}
      >
        Save comment
      </Button>
    </div>
  );
}

export function StayContactBlock({
  stay,
  tenantSlug,
  onStayUpdated,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  onStayUpdated?: (stay: GuestStayRecordWithLink) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();
  const confirmedPhone = stay.contact_phone?.trim() || '';
  const pendingPhone = stay.contact_phone_pending?.trim() || '';
  const email = stay.contact_email?.trim() || '';
  const whatsappHref = confirmedPhone ? buildWhatsappMeHref(confirmedPhone) : null;
  const pendingWhatsappHref = pendingPhone ? buildWhatsappMeHref(pendingPhone) : null;
  const mailtoHref = email ? `mailto:${email}` : null;

  if (!confirmedPhone && !pendingPhone && !email) {
    return (
      <div className="space-y-1 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Contact
        </p>
        <p className="text-sm text-muted-foreground">No phone or email on this booking.</p>
      </div>
    );
  }

  const handleConfirm = () => {
    startAction(async () => {
      setActionError(null);
      const result = await confirmGuestStayContactPhoneAction({
        tenantSlug,
        stayId: stay.id,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'unauthorized'
            ? 'Sign in again at reception desk.'
            : result.error === 'no_pending'
              ? 'No guest phone change to confirm.'
              : 'Could not confirm phone.'
        );
        return;
      }
      onStayUpdated?.({
        ...stay,
        ...result.stay,
        magicLinkUrl: stay.magicLinkUrl,
      });
    });
  };

  const handleReject = () => {
    startAction(async () => {
      setActionError(null);
      const result = await rejectGuestStayContactPhoneAction({
        tenantSlug,
        stayId: stay.id,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'unauthorized'
            ? 'Sign in again at reception desk.'
            : result.error === 'no_pending'
              ? 'No guest phone change to dismiss.'
              : 'Could not dismiss phone change.'
        );
        return;
      }
      onStayUpdated?.({
        ...stay,
        ...result.stay,
        magicLinkUrl: stay.magicLinkUrl,
      });
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</p>

      {pendingPhone ? (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="text-xs font-medium text-amber-900">Guest proposed a new number</p>
          {pendingWhatsappHref ? (
            <a
              href={pendingWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {pendingPhone}
            </a>
          ) : (
            <p className="text-sm font-medium">{pendingPhone}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={isPending}
              onClick={handleConfirm}
            >
              Confirm new number
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={isPending}
              onClick={handleReject}
            >
              Keep current
            </Button>
          </div>
        </div>
      ) : null}

      {confirmedPhone ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {pendingPhone ? 'Current confirmed phone' : 'Phone'}
          </p>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {confirmedPhone}
            </a>
          ) : (
            <p className="text-sm">{confirmedPhone}</p>
          )}
        </div>
      ) : null}

      {email ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Email</p>
          {mailtoHref ? (
            <a
              href={mailtoHref}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {email}
            </a>
          ) : (
            <p className="text-sm">{email}</p>
          )}
        </div>
      ) : null}

      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
    </div>
  );
}
