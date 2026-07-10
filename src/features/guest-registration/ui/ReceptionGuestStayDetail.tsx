'use client';

import { useEffect, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import type { GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';
import type { TenantSettings } from '@/entities/tenant';
import { formatReceptionBookingSourceSummary } from '@/entities/tenant';
import {
  getTourismDocumentSignedUrlAction,
  loadTourismRegistrationForReceptionAction,
  setTourismExportedAction,
} from '@/features/guest-tourism-registration';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { formatReservationBookingBalanceSummary } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import {
  guestAccessStatusLabel,
  resolveGuestAccessStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import { formatDisplayDate, formatReceptionDateTime } from '../lib/guestAccessDates';
import { MagicLinkCard } from './MagicLinkCard';
import { ReceptionStayDetailShell, RECEPTION_STAY_DETAIL_TITLE_ID } from './ReceptionStayDetailShell';
import { Button } from '@/shared/ui';
import { setGuestReservationBookingPaidAction } from '../actions/receptionActions';

export { RECEPTION_STAY_DETAIL_TITLE_ID };

type TourismStatusBadge = 'not_started' | 'in_progress' | 'complete' | 'documents_purged';

function isTourismDocumentsPurged(registration: GuestTourismRegistrationSummary | null): boolean {
  if (!registration) return false;
  return (
    registration.tourism_registration_completed_at != null && registration.guests.length === 0
  );
}

function resolveTourismStatusBadge(
  registration: GuestTourismRegistrationSummary | null
): TourismStatusBadge {
  if (isTourismDocumentsPurged(registration)) {
    return 'documents_purged';
  }
  if (!registration || registration.guests.length === 0) {
    return 'not_started';
  }
  if (isTourismRegistrationComplete(registration)) {
    return 'complete';
  }
  return 'in_progress';
}

function tourismStatusBadgeLabel(status: TourismStatusBadge): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'complete':
      return 'Complete';
    case 'documents_purged':
      return 'Documents purged';
  }
}

function buildTourismWhatsappHref(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function StayTourismRegistrationBlock({
  stay,
  tenantSlug,
  onTourismExportedAtChange,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  onTourismExportedAtChange?: (stayId: string, tourismExportedAt: string | null) => void;
}) {
  const [registration, setRegistration] = useState<GuestTourismRegistrationSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isPending, startAction] = useTransition();

  const exportedAt = registration?.tourism_exported_at ?? stay.tourism_exported_at ?? null;

  useEffect(() => {
    startLoad(async () => {
      setLoadError(null);
      const result = await loadTourismRegistrationForReceptionAction({
        tenantSlug,
        stayId: stay.id,
      });
      if (result.ok) {
        setRegistration(result.registration);
        return;
      }
      setRegistration(null);
      setLoadError(
        result.error === 'unauthorized'
          ? 'Sign in to view tourism registration.'
          : 'Could not load tourism registration.'
      );
    });
  }, [stay.id, tenantSlug]);

  const status = resolveTourismStatusBadge(registration);
  const showWhatsapp =
    registration?.tourism_registration_completed_at != null && registration.tourism_contact_whatsapp;

  const handleExportedChange = (checked: boolean) => {
    startAction(async () => {
      setActionError(null);
      const result = await setTourismExportedAction({
        tenantSlug,
        stayId: stay.id,
        exported: checked,
      });
      if (!result.ok) {
        setActionError('Could not update export status.');
        return;
      }

      const nextExportedAt = checked ? new Date().toISOString() : null;
      setRegistration((current) =>
        current ? { ...current, tourism_exported_at: nextExportedAt } : current
      );
      onTourismExportedAtChange?.(stay.id, nextExportedAt);
    });
  };

  const handleViewDocument = (guestId: string, kind: 'passport' | 'entry_stamp') => {
    startAction(async () => {
      setActionError(null);
      const result = await getTourismDocumentSignedUrlAction({
        tenantSlug,
        stayId: stay.id,
        guestId,
        kind,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'documents_expired'
            ? 'Documents expired (retention policy).'
            : 'Could not open document.'
        );
        return;
      }
      window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tourism registration
        </p>
        <span
          className={
            status === 'complete'
              ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900'
              : status === 'documents_purged'
                ? 'rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-800'
                : status === 'in_progress'
                  ? 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-950'
                  : 'rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'
          }
        >
          {tourismStatusBadgeLabel(status)}
        </span>
      </div>

      <dl className="grid gap-1 text-xs">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">Name on reservation</dt>
          <dd className="min-w-0 truncate font-medium">{stay.guest_name?.trim() || '—'}</dd>
        </div>
        {showWhatsapp ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground">Contact WhatsApp</dt>
            <dd>
              <a
                className="font-medium text-primary underline-offset-2 hover:underline"
                href={buildTourismWhatsappHref(registration!.tourism_contact_whatsapp!)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {registration!.tourism_contact_whatsapp}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {loadError ? <p className="text-xs text-destructive">{loadError}</p> : null}
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading guests…</p>
      ) : status === 'documents_purged' ? (
        <p className="text-xs text-muted-foreground">
          Guest document copies were removed after the retention period. Export status and
          completion time are kept for audit.
        </p>
      ) : registration && registration.guests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-1 pr-2 font-medium">Guest</th>
                <th className="pb-1 font-medium">Documents</th>
              </tr>
            </thead>
            <tbody>
              {registration.guests.map((guest) => (
                <tr key={guest.id} className="border-t border-border/50">
                  <td className="py-1.5 pr-2 align-top">
                    {guest.first_name} {guest.last_name}
                  </td>
                  <td className="py-1.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={isPending}
                        onClick={() => handleViewDocument(guest.id, 'passport')}
                      >
                        View passport
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={isPending}
                        onClick={() => handleViewDocument(guest.id, 'entry_stamp')}
                      >
                        View stamp
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <label className="flex cursor-pointer items-start gap-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={exportedAt != null}
          disabled={isPending || isLoading}
          onChange={(event) => handleExportedChange(event.target.checked)}
        />
        <span>Submitted to tourism organization</span>
      </label>
    </div>
  );
}

function StayBookingBalanceBlock({
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

  const summary = formatReservationBookingBalanceSummary(stay);
  const hasBalance = stay.booking_amount_due_minor != null && stay.booking_amount_currency;
  const isPaid = Boolean(stay.booking_paid_at);

  const handleTogglePaid = () => {
    startAction(async () => {
      setActionError(null);
      const result = await setGuestReservationBookingPaidAction({
        tenantSlug,
        stayId: stay.id,
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
        ...stay,
        ...result.stay,
        magicLinkUrl: stay.magicLinkUrl,
      });
    });
  };

  if (!hasBalance) {
    return (
      <p className="text-xs text-muted-foreground">No balance recorded for this stay.</p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Stay balance
      </p>
      <p className="text-sm">{summary}</p>
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

export interface ReceptionGuestStayDetailProps {
  open: boolean;
  onClose: () => void;
  stay: GuestStayRecordWithLink;
  stayPins: Record<string, string>;
  isPending: boolean;
  hostelName: string;
  guestAccessMessageTemplate: string;
  guestAccessPinMissingText: string;
  resolveBedLabel: (bedId: string) => string;
  omitBedFromGuestMessage?: boolean;
  tourismRegistrationRequired?: boolean;
  tenantSlug?: string;
  onTourismExportedAtChange?: (stayId: string, tourismExportedAt: string | null) => void;
  onStayBookingBalanceChange?: (stay: GuestStayRecordWithLink) => void;
  onRevoke: (stayId: string) => void;
  onChangeDates: (stay: GuestStayRecordWithLink) => void;
  onMoveBed: (stay: GuestStayRecordWithLink) => void;
  onReissueAccess: (stay: GuestStayRecordWithLink) => void;
  onMarkArrived: (input: { stayId: string; keyIssued: boolean }) => void;
  markArrivedError?: string | null;
  tenantSettings?: TenantSettings;
}

function canMarkDeskArrived(stay: GuestStayRecordWithLink): boolean {
  if (stay.revoked_at || stay.desk_checked_in_at) {
    return false;
  }
  const status = resolveGuestAccessStatus(stay);
  return status !== 'ended';
}

function ReceptionGuestStayDetailActions({
  stay,
  isPending,
  onChangeDates,
  onMoveBed,
  onReissueAccess,
  onRevoke,
  onMarkArrived,
  markArrivedError,
}: Pick<
  ReceptionGuestStayDetailProps,
  | 'stay'
  | 'isPending'
  | 'onChangeDates'
  | 'onMoveBed'
  | 'onReissueAccess'
  | 'onRevoke'
  | 'onMarkArrived'
  | 'markArrivedError'
>) {
  const [keyIssued, setKeyIssued] = useState(false);
  const showMarkArrived = canMarkDeskArrived(stay);

  return (
    <div className="flex flex-col gap-3">
      {markArrivedError ? <p className="text-xs text-destructive">{markArrivedError}</p> : null}
      {showMarkArrived ? (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={keyIssued}
              disabled={isPending}
              onChange={(event) => setKeyIssued(event.target.checked)}
            />
            <span>Room key issued</span>
          </label>
          <Button
            type="button"
            size="default"
            className="w-full"
            disabled={isPending}
            onClick={() => onMarkArrived({ stayId: stay.id, keyIssued })}
          >
            Mark arrived
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 lg:flex-row">
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full lg:flex-1"
          disabled={isPending}
          onClick={() => onMoveBed(stay)}
        >
          Move bed
        </Button>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full lg:flex-1"
          disabled={isPending}
          onClick={() => onChangeDates(stay)}
        >
          Change dates
        </Button>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full lg:flex-1"
          disabled={isPending}
          onClick={() => onReissueAccess(stay)}
        >
          Reissue access
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="default"
          className="w-full lg:flex-1"
          disabled={isPending}
          onClick={() => onRevoke(stay.id)}
        >
          Revoke access
        </Button>
      </div>
    </div>
  );
}

export function ReceptionGuestStayDetail({
  open,
  onClose,
  stay,
  stayPins,
  isPending,
  hostelName,
  guestAccessMessageTemplate,
  guestAccessPinMissingText,
  resolveBedLabel,
  omitBedFromGuestMessage = false,
  tourismRegistrationRequired = false,
  tenantSlug,
  onTourismExportedAtChange,
  onStayBookingBalanceChange,
  onRevoke,
  onChangeDates,
  onMoveBed,
  onReissueAccess,
  onMarkArrived,
  markArrivedError,
  tenantSettings,
}: ReceptionGuestStayDetailProps) {
  const status = resolveGuestAccessStatus(stay);
  const stayRef = formatStayReference(stay.id);
  const checkInDay = stay.check_in_at.slice(0, 10);
  const checkOutDay = stay.check_out_at.slice(0, 10);
  const guestLabel = stay.guest_name?.trim() || 'Guest';
  const bedLabel = resolveBedLabel(stay.bed_id);
  const bookingSourceLine = formatReceptionBookingSourceSummary(
    tenantSettings,
    stay.booking_platform_id,
    stay.booking_external_id
  );

  const header = (
    <header className="space-y-1">
      <p className="text-sm text-muted-foreground">
        {bedLabel}
        {stayRef ? (
          <span className="font-mono">
            {' '}
            · #{stayRef}
          </span>
        ) : null}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDisplayDate(checkInDay)} → {formatDisplayDate(checkOutDay)} ·{' '}
        {guestAccessStatusLabel(status)}
      </p>
      {stay.desk_checked_in_at ? (
        <p className="text-xs font-medium text-emerald-800">
          Arrived · {formatReceptionDateTime(stay.desk_checked_in_at)}
        </p>
      ) : null}
      {bookingSourceLine ? (
        <p className="text-xs text-muted-foreground">{bookingSourceLine}</p>
      ) : null}
    </header>
  );

  const body = (
    <div className="space-y-4">
      {!stay.magicLinkUrl ? (
        <p className="text-xs text-muted-foreground">Link unavailable — re-issue access.</p>
      ) : (
        <MagicLinkCard
          magicLinkUrl={stay.magicLinkUrl}
          bedId={stay.bed_id}
          bedLabel={bedLabel}
          guestName={stay.guest_name ?? undefined}
          guestPin={stayPins[stay.id]}
          hostelName={hostelName}
          guestAccessMessageTemplate={guestAccessMessageTemplate}
          guestAccessPinMissingText={guestAccessPinMissingText}
          omitBedFromMessage={omitBedFromGuestMessage}
        />
      )}

      {tenantSlug ? (
        <StayBookingBalanceBlock
          stay={stay}
          tenantSlug={tenantSlug}
          onStayUpdated={onStayBookingBalanceChange}
        />
      ) : null}

      {tourismRegistrationRequired && tenantSlug ? (
        <StayTourismRegistrationBlock
          stay={stay}
          tenantSlug={tenantSlug}
          onTourismExportedAtChange={onTourismExportedAtChange}
        />
      ) : null}
    </div>
  );

  const footer = (
    <ReceptionGuestStayDetailActions
      stay={stay}
      isPending={isPending}
      onChangeDates={onChangeDates}
      onMoveBed={onMoveBed}
      onReissueAccess={onReissueAccess}
      onRevoke={onRevoke}
      onMarkArrived={onMarkArrived}
      markArrivedError={markArrivedError}
    />
  );

  return (
    <ReceptionStayDetailShell
      open={open}
      onClose={onClose}
      accessibleTitle={guestLabel}
      header={header}
      body={body}
      footer={footer}
    />
  );
}
