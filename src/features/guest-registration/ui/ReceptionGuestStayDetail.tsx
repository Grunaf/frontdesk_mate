'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { GuestTourismGuest, GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';
import type { TenantSettings } from '@/entities/tenant';
import { formatReceptionBookingSourceSummary } from '@/entities/tenant';
import {
  compressImageForUpload,
  CompressImageForUploadError,
  completeTourismRegistrationForReceptionAction,
  createTourismGuestForReceptionAction,
  getTourismDocumentSignedUrlAction,
  loadTourismRegistrationForReceptionAction,
  ReceptionTourismGuestIdentityForm,
  ReceptionAddTourismGuestSheet,
  setPassportCheckedAction,
  setTourismExportedAction,
  updateTourismGuestIdentityForReceptionAction,
  uploadTourismDocumentForReceptionAction,
  type ReceptionTourismGuestIdentityValues,
} from '@/features/guest-tourism-registration';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { stayRecordCheckInDate, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { formatReservationBookingBalanceSummary } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import {
  guestAccessCheckInPolicyFromSettings,
  guestAccessStatusLabel,
  resolveGuestAccessStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import { formatDisplayDate, formatReceptionDateTime } from '../lib/guestAccessDates';
import { resolveStayCancelCheckoutAction } from '../lib/resolveStayCancelCheckoutAction';
import {
  resolveAccessTabBadge,
  resolveTourismStatusBadge,
  resolveTourismTabBadge,
  tourismStatusBadgeLabel,
  type StayDetailTabBadgeTone,
  type StayDetailTabId,
  type TourismStatusBadge,
} from '../lib/resolveStayDetailTabBadge';
import { MagicLinkCard } from './MagicLinkCard';
import { ReceptionArrivalDatesBlock } from './ReceptionArrivalDatesBlock';
import { ReceptionStayDetailShell, RECEPTION_STAY_DETAIL_TITLE_ID } from './ReceptionStayDetailShell';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { EllipsisVertical } from 'lucide-react';
import { setGuestReservationBookingPaidAction } from '../actions/receptionActions';

export { RECEPTION_STAY_DETAIL_TITLE_ID };

function buildTourismWhatsappHref(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function StayDetailTabToneDot({ tone }: { tone: StayDetailTabBadgeTone }) {
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

function StayAdmitToCheckInBlock({
  stay,
  tenantSlug,
  tourismRegistrationRequired,
  onStayUpdated,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  tourismRegistrationRequired: boolean;
  onStayUpdated?: (stay: GuestStayRecordWithLink) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();
  const [passportCheckedAt, setPassportCheckedAt] = useState(stay.passport_checked_at);
  const [keyIssued, setKeyIssued] = useState(false);
  const admitted = Boolean(passportCheckedAt);

  useEffect(() => {
    setPassportCheckedAt(stay.passport_checked_at);
    setKeyIssued(false);
  }, [stay.passport_checked_at, stay.id]);

  const handleSetChecked = (checked: boolean) => {
    startAction(async () => {
      setActionError(null);
      const result = await setPassportCheckedAction({
        tenantSlug,
        stayId: stay.id,
        checked,
        keyIssued: checked ? keyIssued : undefined,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'unauthorized'
            ? 'Sign in again at reception desk.'
            : 'Could not update admit status.'
        );
        return;
      }

      setPassportCheckedAt(result.stay.passport_checked_at);
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
        Check-in admit
      </p>
      {admitted ? (
        <p className="text-sm font-medium text-emerald-800">Admitted</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {tourismRegistrationRequired
            ? 'Confirm original passport was checked in person.'
            : 'Admit guest to unlock bed selection in the guest app.'}
        </p>
      )}
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      {admitted ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={isPending}
          onClick={() => handleSetChecked(false)}
        >
          Undo admit
        </Button>
      ) : (
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
            size="sm"
            className="h-8"
            disabled={isPending}
            onClick={() => handleSetChecked(true)}
          >
            Admit to check-in
          </Button>
        </div>
      )}
    </div>
  );
}

function useIsBelowLg(): boolean {
  const [isBelowLg, setIsBelowLg] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsBelowLg(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isBelowLg;
}

function StayTourismRegistrationBlock({
  stay,
  tenantSlug,
  onTourismExportedAtChange,
  onTourismStatusChange,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  onTourismExportedAtChange?: (stayId: string, tourismExportedAt: string | null) => void;
  onTourismStatusChange?: (status: TourismStatusBadge) => void;
}) {
  const isBelowLg = useIsBelowLg();
  const [registration, setRegistration] = useState<GuestTourismRegistrationSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isPending, startAction] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addGuestSheetOpen, setAddGuestSheetOpen] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  const exportedAt = registration?.tourism_exported_at ?? stay.tourism_exported_at ?? null;
  const checkInDate = stayRecordCheckInDate(stay);
  const registrationComplete = Boolean(registration?.tourism_registration_completed_at);
  const hasGuests = Boolean(registration && registration.guests.length > 0);

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

  useEffect(() => {
    onTourismStatusChange?.(status);
  }, [status, onTourismStatusChange]);

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

  const handleViewPassport = (guestId: string) => {
    startAction(async () => {
      setActionError(null);
      const result = await getTourismDocumentSignedUrlAction({
        tenantSlug,
        stayId: stay.id,
        guestId,
        kind: 'passport',
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

  const patchGuest = (guestId: string, patch: Partial<GuestTourismGuest>) => {
    setRegistration((current) => {
      if (!current) return current;
      return {
        ...current,
        guests: current.guests.map((guest) =>
          guest.id === guestId ? { ...guest, ...patch } : guest
        ),
      };
    });
  };

  const handleUploadPassport = (guestId: string, file: File) => {
    startAction(async () => {
      setActionError(null);
      try {
        const compressed = await compressImageForUpload(file);
        const formData = new FormData();
        formData.set('file', compressed);
        const result = await uploadTourismDocumentForReceptionAction({
          tenantSlug,
          stayId: stay.id,
          guestId,
          formData,
        });
        if (!result.ok) {
          setActionError(
            result.error === 'unauthorized'
              ? 'Sign in again at reception desk.'
              : result.error === 'invalid_file'
                ? 'Invalid image file.'
                : 'Could not upload passport photo.'
          );
          return;
        }
        patchGuest(guestId, { passport_storage_path: result.storagePath });
      } catch (error) {
        if (error instanceof CompressImageForUploadError) {
          setActionError(
            error.code === 'file_too_large'
              ? 'Image is too large.'
              : error.code === 'not_an_image'
                ? 'Select an image file.'
                : 'Could not process image.'
          );
          return;
        }
        setActionError('Could not upload passport photo.');
      }
    });
  };

  const handleSaveEntryStampDates = (patchByGuestId: Record<string, string | null>) => {
    setRegistration((current) => {
      if (!current) return current;
      return {
        ...current,
        guests: current.guests.map((guest) => {
          if (!(guest.id in patchByGuestId)) {
            return guest;
          }
          return {
            ...guest,
            entry_stamp_date: patchByGuestId[guest.id] ?? null,
            entry_stamp_storage_path: '',
          };
        }),
      };
    });
  };

  const resolveIdentityActionError = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return 'Sign in again at reception desk.';
      case 'registration_closed':
        return 'Registration is already complete — you cannot add more guests.';
      case 'invalid_input':
        return 'Check the guest details and try again.';
      case 'feature_disabled':
        return 'Tourist registration is not enabled for this hostel.';
      case 'no_guests':
        return 'Add at least one guest before completing registration.';
      default:
        return 'Could not save guest identity.';
    }
  };

  const handleAddGuest = (values: ReceptionTourismGuestIdentityValues) => {
    startAction(async () => {
      setActionError(null);
      const result = await createTourismGuestForReceptionAction({
        tenantSlug,
        stayId: stay.id,
        identity: values,
      });
      if (!result.ok) {
        setActionError(resolveIdentityActionError(result.error));
        return;
      }

      setRegistration((current) => {
        if (!current) {
          return {
            stay_id: stay.id,
            tourism_contact_whatsapp: null,
            tourism_registration_completed_at: null,
            tourism_exported_at: stay.tourism_exported_at ?? null,
            entry_transport_type: null,
            entry_point_code: null,
            entry_point_label: null,
            entry_details_status: null,
            guests: [result.guest],
          };
        }
        return {
          ...current,
          guests: [...current.guests, result.guest],
        };
      });
      setShowAddForm(false);
      setAddGuestSheetOpen(false);
    });
  };

  const handleUpdateGuest = (guestId: string, values: ReceptionTourismGuestIdentityValues) => {
    startAction(async () => {
      setActionError(null);
      const result = await updateTourismGuestIdentityForReceptionAction({
        tenantSlug,
        stayId: stay.id,
        guestId,
        identity: values,
      });
      if (!result.ok) {
        setActionError(resolveIdentityActionError(result.error));
        return;
      }

      patchGuest(guestId, result.guest);
      setEditingGuestId(null);
    });
  };

  const handleCompleteRegistration = () => {
    startAction(async () => {
      setActionError(null);
      const result = await completeTourismRegistrationForReceptionAction({
        tenantSlug,
        stayId: stay.id,
      });
      if (!result.ok) {
        setActionError(resolveIdentityActionError(result.error));
        return;
      }

      setRegistration((current) =>
        current
          ? { ...current, tourism_registration_completed_at: result.completedAt }
          : current
      );
      setShowAddForm(false);
      setEditingGuestId(null);
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
      ) : (
        <div className="space-y-3">
          {hasGuests ? (
            <>
              <ReceptionArrivalDatesBlock
                tenantSlug={tenantSlug}
                stayId={stay.id}
                guests={registration!.guests}
                disabled={isPending}
                onError={setActionError}
                onGuestsPatched={handleSaveEntryStampDates}
              />
              <ul className="space-y-3">
                {registration!.guests.map((guest) => (
                  <li
                    key={guest.id}
                    className="space-y-2 border-t border-border/50 pt-2 first:border-t-0 first:pt-0"
                  >
                    {editingGuestId === guest.id ? (
                      <ReceptionTourismGuestIdentityForm
                        checkInDate={checkInDate}
                        initialValues={{
                          firstName: guest.first_name,
                          lastName: guest.last_name,
                          dateOfBirth: guest.date_of_birth,
                          countryOfBirth: guest.country_of_birth,
                          placeOfBirth: guest.place_of_birth,
                          gender: guest.gender,
                          citizenship: guest.citizenship,
                          documentType: guest.document_type,
                          passportNumber: guest.passport_number,
                        }}
                        submitLabel="Save guest"
                        pendingLabel="Saving…"
                        disabled={isPending}
                        isPending={isPending}
                        onCancel={() => setEditingGuestId(null)}
                        onSubmit={(values) => handleUpdateGuest(guest.id, values)}
                      />
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium">
                              {guest.first_name} {guest.last_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {guest.citizenship} · {guest.passport_number} · {guest.date_of_birth} ·{' '}
                              {guest.gender === 'female' ? 'Female' : 'Male'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            disabled={isPending}
                            onClick={() => {
                              setShowAddForm(false);
                              setAddGuestSheetOpen(false);
                              setEditingGuestId(guest.id);
                            }}
                          >
                            Edit identity
                          </Button>
                        </div>
                        <ReceptionTourismGuestDocuments
                          guest={guest}
                          disabled={isPending}
                          onUploadPassport={(file) => handleUploadPassport(guest.id, file)}
                          onViewPassport={() => handleViewPassport(guest.id)}
                        />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : !loadError ? (
            <p className="text-xs text-muted-foreground">
              No tourism guests yet — add identity details at the desk or wait for the guest app.
            </p>
          ) : null}

          {!isBelowLg && showAddForm && !registrationComplete ? (
            <ReceptionTourismGuestIdentityForm
              checkInDate={checkInDate}
              submitLabel="Add guest"
              pendingLabel="Adding…"
              disabled={isPending}
              isPending={isPending}
              onCancel={() => setShowAddForm(false)}
              onSubmit={handleAddGuest}
            />
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {!registrationComplete && !(isBelowLg ? addGuestSheetOpen : showAddForm) ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={isPending || isLoading}
                onClick={() => {
                  setEditingGuestId(null);
                  if (isBelowLg) {
                    setAddGuestSheetOpen(true);
                  } else {
                    setShowAddForm(true);
                  }
                }}
              >
                Add guest
              </Button>
            ) : null}
            {hasGuests && !registrationComplete ? (
              <Button
                type="button"
                size="sm"
                className="h-7 text-[11px]"
                disabled={isPending || isLoading}
                onClick={handleCompleteRegistration}
              >
                Complete registration
              </Button>
            ) : null}
          </div>
        </div>
      )}

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

      <ReceptionAddTourismGuestSheet
        open={addGuestSheetOpen}
        onOpenChange={setAddGuestSheetOpen}
        checkInDate={checkInDate}
        isPending={isPending}
        error={addGuestSheetOpen ? actionError : null}
        onSubmit={handleAddGuest}
      />
    </div>
  );
}

function ReceptionTourismGuestDocuments({
  guest,
  disabled,
  onUploadPassport,
  onViewPassport,
}: {
  guest: GuestTourismGuest;
  disabled: boolean;
  onUploadPassport: (file: File) => void;
  onViewPassport: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPassport = Boolean(guest.passport_storage_path.trim());

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/webp,image/png,image/heic,image/heif,.jpg,.jpeg,.webp,.png,.heic,.heif"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              onUploadPassport(file);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          {hasPassport ? 'Replace passport' : 'Upload passport'}
        </Button>
        {hasPassport ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={disabled}
            onClick={onViewPassport}
          >
            View passport
          </Button>
        ) : null}
      </div>
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
  tourismRegistrationRequired?: boolean;
  tenantSlug?: string;
  onTourismExportedAtChange?: (stayId: string, tourismExportedAt: string | null) => void;
  onStayBookingBalanceChange?: (stay: GuestStayRecordWithLink) => void;
  onPassportCheckedAtChange?: (stay: GuestStayRecordWithLink) => void;
  /** Cancel (not admitted) or check out (admitted, still in-house) → Archive. */
  onCancelOrCheckout: (stayId: string, intent: 'cancel' | 'checkout') => void;
  /** Opens unified edit (bed + dates). */
  onEditStay: (stay: GuestStayRecordWithLink) => void;
  onReissueAccess: (stay: GuestStayRecordWithLink) => void;
  tenantSettings?: TenantSettings;
  /** Current operational calendar day — gates Check out vs ended stays. */
  operationalDate: string;
}

function ReceptionGuestStayDetailActions({
  stay,
  isPending,
  onCancelOrCheckout,
  operationalDate,
}: Pick<
  ReceptionGuestStayDetailProps,
  'stay' | 'isPending' | 'onCancelOrCheckout' | 'operationalDate'
>) {
  const endAction = resolveStayCancelCheckoutAction({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
  });

  if (endAction !== 'checkout') {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row">
      <Button
        type="button"
        variant="destructive"
        size="default"
        className="w-full"
        disabled={isPending}
        onClick={() => onCancelOrCheckout(stay.id, 'checkout')}
      >
        Check out
      </Button>
    </div>
  );
}

function ReceptionGuestStayDetailOverflowMenu({
  stay,
  isPending,
  onCancelOrCheckout,
  operationalDate,
}: Pick<
  ReceptionGuestStayDetailProps,
  'stay' | 'isPending' | 'onCancelOrCheckout' | 'operationalDate'
>) {
  const endAction = resolveStayCancelCheckoutAction({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
  });

  if (endAction !== 'cancel') {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={isPending}>
          <EllipsisVertical />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onSelect={() => onCancelOrCheckout(stay.id, 'cancel')}
        >
          Cancel booking
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  tourismRegistrationRequired = false,
  tenantSlug,
  onTourismExportedAtChange,
  onStayBookingBalanceChange,
  onPassportCheckedAtChange,
  onCancelOrCheckout,
  onEditStay,
  onReissueAccess,
  tenantSettings,
  operationalDate,
}: ReceptionGuestStayDetailProps) {
  const [activeTab, setActiveTab] = useState<StayDetailTabId>('access');
  const [tourismStatus, setTourismStatus] = useState<TourismStatusBadge | null>(null);
  const showTourismTab = tourismRegistrationRequired && Boolean(tenantSlug);

  useEffect(() => {
    setActiveTab('access');
    setTourismStatus(showTourismTab ? 'not_started' : null);
  }, [stay.id, showTourismTab]);

  useEffect(() => {
    if (!showTourismTab || !tenantSlug) {
      return;
    }

    let cancelled = false;
    void loadTourismRegistrationForReceptionAction({
      tenantSlug,
      stayId: stay.id,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTourismStatus(resolveTourismStatusBadge(result.registration));
        return;
      }
      setTourismStatus('not_started');
    });

    return () => {
      cancelled = true;
    };
  }, [stay.id, tenantSlug, showTourismTab]);

  const status = resolveGuestAccessStatus(
    stay,
    new Date(),
    guestAccessCheckInPolicyFromSettings(tenantSettings)
  );
  const stayRef = formatStayReference(stay.id);
  const checkInDay = stayRecordCheckInDate(stay);
  const checkOutDay = stayRecordCheckOutDate(stay);
  const guestLabel = stay.guest_name?.trim() || 'Guest';
  const bedLabel = resolveBedLabel(stay.bed_id);
  const bookingSourceLine = formatReceptionBookingSourceSummary(
    tenantSettings,
    stay.booking_platform_id,
    stay.booking_external_id
  );
  const admittedAt = stay.passport_checked_at ?? stay.desk_checked_in_at;
  const endAction = resolveStayCancelCheckoutAction({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
  });
  const accessTabTone = resolveAccessTabBadge({
    hasMagicLink: Boolean(stay.magicLinkUrl),
    hasPinInSession: Boolean(stayPins[stay.id]),
  });
  const tourismTabTone = resolveTourismTabBadge(
    showTourismTab ? (tourismStatus ?? 'not_started') : null
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
      {admittedAt ? (
        <p className="text-xs font-medium text-emerald-800">
          Admitted · {formatReceptionDateTime(admittedAt)}
        </p>
      ) : null}
      {bookingSourceLine ? (
        <p className="text-xs text-muted-foreground">{bookingSourceLine}</p>
      ) : null}
    </header>
  );

  const footer = (
    <ReceptionGuestStayDetailActions
      stay={stay}
      isPending={isPending}
      onCancelOrCheckout={onCancelOrCheckout}
      operationalDate={operationalDate}
    />
  );

  const tabsList = (
    <TabsList variant="line" className="w-full justify-start">
      <TabsTrigger value="access" className="inline-flex items-center gap-1.5">
        Access
        <StayDetailTabToneDot tone={accessTabTone} />
      </TabsTrigger>
      <TabsTrigger value="stay">Stay</TabsTrigger>
      {showTourismTab ? (
        <TabsTrigger value="tourism" className="inline-flex items-center gap-1.5">
          Tourism
          <StayDetailTabToneDot tone={tourismTabTone} />
        </TabsTrigger>
      ) : null}
    </TabsList>
  );

  const tabsBody = (
    <>
      <TabsContent value="access" className="mt-0 space-y-4 outline-none">
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
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="default"
          className="w-full"
          disabled={isPending}
          onClick={() => onReissueAccess(stay)}
        >
          Reissue access
        </Button>
      </TabsContent>

      <TabsContent value="stay" className="mt-0 space-y-4 outline-none">
        {tenantSlug ? (
          <StayAdmitToCheckInBlock
            stay={stay}
            tenantSlug={tenantSlug}
            tourismRegistrationRequired={tourismRegistrationRequired}
            onStayUpdated={onPassportCheckedAtChange}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Stay actions unavailable.</p>
        )}
        {tenantSlug ? (
          <StayBookingBalanceBlock
            stay={stay}
            tenantSlug={tenantSlug}
            onStayUpdated={onStayBookingBalanceChange}
          />
        ) : null}
      </TabsContent>

      {showTourismTab ? (
        <TabsContent value="tourism" className="mt-0 outline-none">
          {activeTab === 'tourism' && tenantSlug ? (
            <StayTourismRegistrationBlock
              stay={stay}
              tenantSlug={tenantSlug}
              onTourismExportedAtChange={onTourismExportedAtChange}
              onTourismStatusChange={setTourismStatus}
            />
          ) : null}
        </TabsContent>
      ) : null}
    </>
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as StayDetailTabId)}
      className="contents"
    >
      <ReceptionStayDetailShell
        open={open}
        onClose={onClose}
        accessibleTitle={guestLabel}
        header={header}
        bodyTop={tabsList}
        body={tabsBody}
        footer={footer}
        onEdit={() => onEditStay(stay)}
        editDisabled={isPending}
        headerOverflow={
          endAction === 'cancel' ? (
            <ReceptionGuestStayDetailOverflowMenu
              stay={stay}
              isPending={isPending}
              onCancelOrCheckout={onCancelOrCheckout}
              operationalDate={operationalDate}
            />
          ) : undefined
        }
      />
    </Tabs>
  );
}
