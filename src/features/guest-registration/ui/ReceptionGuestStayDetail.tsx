'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { GuestTourismGuest, GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';
import type { TenantSettings } from '@/entities/tenant';
import {
  formatReceptionBookingSourceSummary,
  resolveBookingComHotelId,
} from '@/entities/tenant';
import {
  compressImageForUpload,
  CompressImageForUploadError,
  completeTourismRegistrationForReceptionAction,
  createTourismGuestForReceptionAction,
  getTourismDocumentSignedUrlAction,
  loadTourismRegistrationForReceptionAction,
  ReceptionTourismGuestIdentityForm,
  ReceptionAddTourismGuestSheet,
  setKeyIssuedForReceptionAction,
  setPassportCheckedAction,
  setTourismExportedAction,
  updateTourismGuestIdentityForReceptionAction,
  uploadTourismDocumentForReceptionAction,
  type ReceptionTourismGuestIdentityValues,
} from '@/features/guest-tourism-registration';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { stayRecordCheckInDate, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { guestProfileToIdentityPrefill } from '@/entities/guest';
import { formatReservationBookingBalanceSummary } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import {
  guestAccessCheckInPolicyFromSettings,
  guestAccessStatusLabel,
  resolveGuestAccessStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import { buildBookingComReservationUrl } from '../lib/buildBookingComReservationUrl';
import { formatDisplayDate, formatReceptionDateTime } from '../lib/guestAccessDates';
import { getGuestProfileAction } from '../actions/receptionActions';
import {
  isStayCheckoutOverdue,
  resolveStayCancelCheckoutAction,
} from '../lib/resolveStayCancelCheckoutAction';
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
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FieldLabelHelp,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { receptionStaffCanSkipTourismGate } from '@/entities/reception-user';
import { cn } from '@/shared/lib/utils';
import { EllipsisVertical, QrCode } from 'lucide-react';
import { setGuestReservationBookingPaidAction, setGuestReservationReceptionNoteAction } from '../actions/receptionActions';

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

function allTourismGuestsHavePassportPhoto(guests: GuestTourismGuest[]): boolean {
  return guests.length > 0 && guests.every((guest) => guest.passport_storage_path.trim().length > 0);
}

function isTourismReadyForAccess(registration: GuestTourismRegistrationSummary | null): boolean {
  if (!registration?.tourism_registration_completed_at) return false;
  return allTourismGuestsHavePassportPhoto(registration.guests);
}

function mapAccessActionError(error: string): string {
  switch (error) {
    case 'unauthorized':
      return 'Sign in again at reception desk.';
    case 'forbidden':
      return 'You do not have permission to skip the tourism gate.';
    case 'tourism_incomplete':
      return 'Complete tourism registration and upload passport photos before granting access.';
    case 'missing_documents':
      return 'Upload a passport photo for each guest before granting access.';
    default:
      return 'Could not update access status.';
  }
}

/** Past exclusive check-out day or archived — block live mutate (edit/grant/tourism/reissue). */
function isReceptionStayPastCheckOut(
  stay: Pick<GuestStayRecordWithLink, 'is_archived' | 'check_out_date' | 'check_out_at'>,
  operationalDate: string
): boolean {
  return Boolean(stay.is_archived) || operationalDate >= stayRecordCheckOutDate(stay);
}

function useStayAccessControls({
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
  const [passportCheckedAt, setPassportCheckedAt] = useState(stay.passport_checked_at);
  const [keyIssued, setKeyIssued] = useState(Boolean(stay.key_issued_at));
  const accessGranted = Boolean(passportCheckedAt);

  useEffect(() => {
    setPassportCheckedAt(stay.passport_checked_at);
    setKeyIssued(Boolean(stay.key_issued_at));
    setActionError(null);
  }, [stay.passport_checked_at, stay.key_issued_at, stay.id]);

  const applyStayUpdate = (next: {
    passport_checked_at: string | null;
    key_issued_at: string | null;
    desk_checked_in_at?: string | null;
  } & Partial<GuestStayRecordWithLink>) => {
    setPassportCheckedAt(next.passport_checked_at);
    setKeyIssued(Boolean(next.key_issued_at));
    onStayUpdated?.({
      ...stay,
      ...next,
      magicLinkUrl: stay.magicLinkUrl,
    });
  };

  const setAccess = (checked: boolean, options?: { bypassAccessGate?: boolean }) => {
    if (!tenantSlug) {
      setActionError('Stay actions unavailable.');
      return;
    }
    startAction(async () => {
      setActionError(null);
      const result = await setPassportCheckedAction({
        tenantSlug,
        stayId: stay.id,
        checked,
        keyIssued: checked ? keyIssued : undefined,
        bypassAccessGate: options?.bypassAccessGate,
      });
      if (!result.ok) {
        setActionError(mapAccessActionError(result.error));
        return;
      }
      applyStayUpdate(result.stay);
    });
  };

  const setKeyIssuedChecked = (nextKeyIssued: boolean) => {
    if (!accessGranted) {
      setKeyIssued(nextKeyIssued);
      return;
    }
    if (!tenantSlug) {
      setActionError('Stay actions unavailable.');
      return;
    }
    startAction(async () => {
      setActionError(null);
      const result = await setKeyIssuedForReceptionAction({
        tenantSlug,
        stayId: stay.id,
        keyIssued: nextKeyIssued,
      });
      if (!result.ok) {
        setActionError(mapAccessActionError(result.error));
        return;
      }
      applyStayUpdate(result.stay);
    });
  };

  return {
    accessGranted,
    keyIssued,
    actionError,
    isPending,
    setKeyIssuedChecked,
    grantAccess: (options?: { bypassAccessGate?: boolean }) => setAccess(true, options),
    revokeAccess: () => setAccess(false),
  };
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
  reviewOnly = false,
  onTourismExportedAtChange,
  onTourismStatusChange,
  onTourismAccessReadyChange,
  onAddGuestControlsChange,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  /** Ended stay: view + filing only (no identity/document mutate). */
  reviewOnly?: boolean;
  onTourismExportedAtChange?: (stayId: string, tourismExportedAt: string | null) => void;
  onTourismStatusChange?: (status: TourismStatusBadge) => void;
  onTourismAccessReadyChange?: (ready: boolean) => void;
  onAddGuestControlsChange?: (
    controls: { openAddGuest: () => void; canAddGuest: boolean } | null
  ) => void;
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
  const [addGuestPrefill, setAddGuestPrefill] =
    useState<Partial<ReceptionTourismGuestIdentityValues> | null>(null);

  const exportedAt = registration?.tourism_exported_at ?? stay.tourism_exported_at ?? null;
  const checkInDate = stayRecordCheckInDate(stay);
  const registrationComplete = Boolean(
    registration?.tourism_registration_completed_at ?? stay.tourism_registration_completed_at
  );
  const hasGuests = Boolean(registration && registration.guests.length > 0);
  const allPassportsUploaded = allTourismGuestsHavePassportPhoto(registration?.guests ?? []);
  const canCompleteRegistration =
    !reviewOnly && hasGuests && allPassportsUploaded && !registrationComplete;
  const canAddGuest =
    !reviewOnly &&
    !registrationComplete &&
    !(isBelowLg ? addGuestSheetOpen : showAddForm) &&
    !isPending &&
    !isLoading;

  const openAddGuest = () => {
    setEditingGuestId(null);
    setAddGuestPrefill(null);
    if (stay.guest_id) {
      void getGuestProfileAction({ tenantSlug, guestId: stay.guest_id }).then((result) => {
        if (!result.ok) return;
        const identity = guestProfileToIdentityPrefill(result.guest);
        if (!identity) {
          if (result.guest.display_name.trim()) {
            const parts = result.guest.display_name.trim().split(/\s+/);
            setAddGuestPrefill({
              firstName: parts[0] ?? '',
              lastName: parts.slice(1).join(' '),
            });
          }
          return;
        }
        setAddGuestPrefill(identity);
      });
    }
    if (isBelowLg) {
      setAddGuestSheetOpen(true);
    } else {
      setShowAddForm(true);
    }
  };

  useEffect(() => {
    onAddGuestControlsChange?.({ openAddGuest, canAddGuest });
    return () => onAddGuestControlsChange?.(null);
    // openAddGuest recreated each render; canAddGuest is the meaningful dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync footer controls
  }, [canAddGuest, isBelowLg, onAddGuestControlsChange, reviewOnly]);

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
  const tourismAccessReady = isTourismReadyForAccess(registration);

  useEffect(() => {
    onTourismStatusChange?.(status);
  }, [status, onTourismStatusChange]);

  useEffect(() => {
    onTourismAccessReadyChange?.(tourismAccessReady);
  }, [tourismAccessReady, onTourismAccessReadyChange]);

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
                : result.error === 'registration_closed'
                  ? 'Registration is already complete — passport upload is closed.'
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
      case 'missing_documents':
        return 'Upload a passport photo for each guest before completing registration.';
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
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

      {showWhatsapp ? (
        <dl className="grid gap-1 text-xs">
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
        </dl>
      ) : null}

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
                disabled={isPending || reviewOnly}
                onError={setActionError}
                onGuestsPatched={handleSaveEntryStampDates}
              />
              <ul className="space-y-3">
                {registration!.guests.map((guest) => (
                  <li
                    key={guest.id}
                    className="space-y-2 border-t border-border/50 pt-2 first:border-t-0 first:pt-0"
                  >
                    {editingGuestId === guest.id && !reviewOnly ? (
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
                          {!reviewOnly ? (
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
                          ) : null}
                        </div>
                        <ReceptionTourismGuestDocuments
                          guest={guest}
                          uploadDisabled={isPending || registrationComplete || reviewOnly}
                          hideUpload={reviewOnly}
                          viewDisabled={isPending}
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
              {reviewOnly
                ? 'No tourism guests on file for this stay.'
                : 'No tourism guests yet — add identity details at the desk or wait for the guest app.'}
            </p>
          ) : null}

          {!isBelowLg && showAddForm && !registrationComplete && !reviewOnly ? (
            <ReceptionTourismGuestIdentityForm
              key={`reception-add-tourism-guest-desktop-${addGuestPrefill?.passportNumber ?? 'new'}`}
              checkInDate={checkInDate}
              initialValues={addGuestPrefill ?? undefined}
              submitLabel="Add guest"
              pendingLabel="Adding…"
              disabled={isPending}
              isPending={isPending}
              onCancel={() => setShowAddForm(false)}
              onSubmit={handleAddGuest}
            />
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {hasGuests && !registrationComplete && !reviewOnly ? (
              <div className="space-y-1">
                {!allPassportsUploaded ? (
                  <p className="text-xs text-muted-foreground">
                    Upload a passport photo for each guest before completing registration.
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={isPending || isLoading || !canCompleteRegistration}
                  onClick={handleCompleteRegistration}
                >
                  Complete registration
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <StayTourismFilingBlock
        registrationComplete={registrationComplete}
        exportedAt={exportedAt}
        isPending={isPending || isLoading}
        onMarkSubmitted={() => handleExportedChange(true)}
        onClearSubmission={() => handleExportedChange(false)}
      />

      <ReceptionAddTourismGuestSheet
        open={addGuestSheetOpen}
        onOpenChange={setAddGuestSheetOpen}
        checkInDate={checkInDate}
        isPending={isPending}
        error={addGuestSheetOpen ? actionError : null}
        initialValues={addGuestPrefill ?? undefined}
        onSubmit={handleAddGuest}
      />
    </div>
  );
}

function ReceptionTourismGuestDocuments({
  guest,
  uploadDisabled,
  hideUpload = false,
  viewDisabled,
  onUploadPassport,
  onViewPassport,
}: {
  guest: GuestTourismGuest;
  uploadDisabled: boolean;
  hideUpload?: boolean;
  viewDisabled: boolean;
  onUploadPassport: (file: File) => void;
  onViewPassport: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPassport = Boolean(guest.passport_storage_path.trim());

  if (hideUpload && !hasPassport) {
    return <p className="text-[11px] text-muted-foreground">No passport photo on file.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-foreground">Passport photo</p>
        <FieldLabelHelp fieldLabel="Passport photo">
          <p>
            Photograph the lower part of the passport so the machine-readable zone (the two lines
            of characters) is sharp and fully visible.
          </p>
          <p>
            Even if a photo already exists, take a new one for this stay — passports can be
            confiscated or altered, and the hostel must verify the physical document to avoid
            liability.
          </p>
        </FieldLabelHelp>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {!hideUpload ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/webp,image/png,image/heic,image/heif,.jpg,.jpeg,.webp,.png,.heic,.heif"
              className="sr-only"
              disabled={uploadDisabled}
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
              disabled={uploadDisabled}
              onClick={() => fileInputRef.current?.click()}
            >
              {hasPassport ? 'Replace passport' : 'Upload passport'}
            </Button>
          </>
        ) : null}
        {hasPassport ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={viewDisabled}
            onClick={onViewPassport}
          >
            View passport
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StayBookingComOpenBlock({
  stay,
  tenantSettings,
}: {
  stay: GuestStayRecordWithLink;
  tenantSettings?: TenantSettings;
}) {
  const hotelId = resolveBookingComHotelId(tenantSettings);
  const reservationId = stay.booking_external_id?.trim() ?? '';
  const openUrl = buildBookingComReservationUrl({
    reservationId,
    hotelId: hotelId ?? '',
  });
  const canOpen = Boolean(openUrl);

  const handleOpen = () => {
    if (!openUrl) return;
    window.open(openUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Booking.com
      </p>
      {reservationId ? (
        <p className="text-sm font-mono">#{reservationId}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No booking reference</p>
      )}
      {!hotelId ? (
        <p className="text-xs text-muted-foreground">
          Set Booking.com hotel ID in admin to open reservations.
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!canOpen}
        onClick={handleOpen}
      >
        Open in Booking
      </Button>
    </div>
  );
}

function StayTourismFilingBlock({
  registrationComplete,
  exportedAt,
  isPending,
  onMarkSubmitted,
  onClearSubmission,
}: {
  registrationComplete: boolean;
  exportedAt: string | null;
  isPending: boolean;
  onMarkSubmitted: () => void;
  onClearSubmission: () => void;
}) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const submitted = exportedAt != null;

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Tourism filing
      </p>
      {!registrationComplete ? (
        <p className="text-xs text-muted-foreground">Available after registration is complete</p>
      ) : submitted ? (
        <>
          <p className="text-sm">
            Submitted
            {exportedAt ? ` · ${formatReceptionDateTime(exportedAt)}` : ''}
          </p>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            disabled={isPending}
            onClick={() => setClearConfirmOpen(true)}
          >
            Clear submission
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Confirm after filing in the tourism portal.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={isPending}
            onClick={onMarkSubmitted}
          >
            Mark as submitted
          </Button>
        </>
      )}
      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear tourism submission?"
        description="Remove the submission mark? This does not undo filing in the external portal."
        cancelLabel="Cancel"
        confirmLabel="Clear submission"
        confirmVariant="destructive"
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          setClearConfirmOpen(false);
          onClearSubmission();
        }}
      />
    </div>
  );
}

function StayRoomKeyBlock({
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

const RECEPTION_NOTE_MAX_LENGTH = 1000;

function StayReceptionNoteBlock({
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
  /** Effective desk permissions for the signed-in staff member. */
  staffPermissions?: readonly string[];
  onTourismExportedAtChange?: (stayId: string, tourismExportedAt: string | null) => void;
  onStayBookingBalanceChange?: (stay: GuestStayRecordWithLink) => void;
  onReceptionNoteChange?: (stay: GuestStayRecordWithLink) => void;
  onPassportCheckedAtChange?: (stay: GuestStayRecordWithLink) => void;
  /** Cancel (not admitted) or check out (admitted, still in-house) → Archive. */
  onCancelOrCheckout: (stayId: string, intent: 'cancel' | 'checkout') => void;
  /** Opens unified edit (bed + dates). */
  onEditStay: (stay: GuestStayRecordWithLink) => void;
  onReissueAccess: (stay: GuestStayRecordWithLink) => void;
  /** Prefill new booking from this stay (extend). */
  onExtendStay: (stay: GuestStayRecordWithLink) => void;
  tenantSettings?: TenantSettings;
  /** Current operational calendar day — gates Check out vs ended stays. */
  operationalDate: string;
  /** Tab on open: after create → access; otherwise stay. */
  initialTab?: StayDetailTabId;
}

function ReceptionGuestStayDetailActions({
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
}: Pick<
  ReceptionGuestStayDetailProps,
  'stay' | 'isPending' | 'onCancelOrCheckout' | 'operationalDate'
> & {
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

function ReceptionGuestStayDetailOverflowMenu({
  stay,
  isPending,
  onCancelOrCheckout,
  onReissueAccess,
  onExtendStay,
  operationalDate,
  accessGranted,
  accessPending,
  onRevokeAccess,
}: Pick<
  ReceptionGuestStayDetailProps,
  | 'stay'
  | 'isPending'
  | 'onCancelOrCheckout'
  | 'onReissueAccess'
  | 'onExtendStay'
  | 'operationalDate'
> & {
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
  staffPermissions = [],
  onTourismExportedAtChange,
  onStayBookingBalanceChange,
  onReceptionNoteChange,
  onPassportCheckedAtChange,
  onCancelOrCheckout,
  onEditStay,
  onReissueAccess,
  onExtendStay,
  tenantSettings,
  operationalDate,
  initialTab = 'stay',
}: ReceptionGuestStayDetailProps) {
  const [activeTab, setActiveTab] = useState<StayDetailTabId>(initialTab);
  const [deskQrFocusKey, setDeskQrFocusKey] = useState(0);
  const [tourismStatus, setTourismStatus] = useState<TourismStatusBadge | null>(null);
  const [tourismAccessReady, setTourismAccessReady] = useState(false);
  const [canAddTourismGuest, setCanAddTourismGuest] = useState(false);
  const [skipTourismConfirmOpen, setSkipTourismConfirmOpen] = useState(false);
  const tourismAddGuestRef = useRef<(() => void) | null>(null);
  const showTourismTab = tourismRegistrationRequired && Boolean(tenantSlug);
  const canSkipTourismGate = receptionStaffCanSkipTourismGate(staffPermissions);

  const openDeskQr = () => {
    setActiveTab('access');
    setDeskQrFocusKey((key) => key + 1);
  };

  const handleTourismAddGuestControlsChange = useCallback(
    (controls: { openAddGuest: () => void; canAddGuest: boolean } | null) => {
      tourismAddGuestRef.current = controls?.openAddGuest ?? null;
      setCanAddTourismGuest(Boolean(controls?.canAddGuest));
    },
    []
  );

  const access = useStayAccessControls({
    stay,
    tenantSlug: tenantSlug ?? '',
    onStayUpdated: onPassportCheckedAtChange,
  });

  const stayEnded = isReceptionStayPastCheckOut(stay, operationalDate);
  const overdueCheckout = isStayCheckoutOverdue({
    passport_checked_at: stay.passport_checked_at,
    desk_checked_in_at: stay.desk_checked_in_at,
    check_out_date: stay.check_out_date,
    check_out_at: stay.check_out_at,
    operationalDate,
    is_archived: stay.is_archived,
    stay_kind: stay.stay_kind,
  });

  const tourismIncomplete =
    showTourismTab && !tourismAccessReady && !access.accessGranted;
  const primaryGrantBlocked = tourismIncomplete && !canSkipTourismGate;

  const requestGrantAccess = () => {
    if (tourismIncomplete) {
      if (!canSkipTourismGate) return;
      setSkipTourismConfirmOpen(true);
      return;
    }
    access.grantAccess();
  };

  const confirmSkipTourismGrant = () => {
    setSkipTourismConfirmOpen(false);
    access.grantAccess({ bypassAccessGate: true });
  };

  useEffect(() => {
    setActiveTab(initialTab);
    setDeskQrFocusKey(0);
    setTourismStatus(showTourismTab ? 'not_started' : null);
    setTourismAccessReady(false);
    setSkipTourismConfirmOpen(false);
    if (!showTourismTab) {
      setCanAddTourismGuest(false);
      tourismAddGuestRef.current = null;
    }
  }, [stay.id, showTourismTab, initialTab]);

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
        setTourismAccessReady(isTourismReadyForAccess(result.registration));
        return;
      }
      setTourismStatus('not_started');
      setTourismAccessReady(false);
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
  const accessGrantedAt =
    access.accessGranted
      ? (stay.passport_checked_at ?? stay.desk_checked_in_at)
      : null;
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
      {overdueCheckout ? (
        <p className="text-xs font-medium text-amber-800">
          Checkout overdue — confirm the guest has left
        </p>
      ) : null}
      {accessGrantedAt ? (
        <p className="text-xs font-medium text-emerald-800">
          Access granted · {formatReceptionDateTime(accessGrantedAt)}
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
      isPending={isPending || access.isPending}
      onCancelOrCheckout={onCancelOrCheckout}
      operationalDate={operationalDate}
      showAddTourismGuest={activeTab === 'tourism' && showTourismTab && !stayEnded}
      onAddTourismGuest={() => tourismAddGuestRef.current?.()}
      addTourismGuestDisabled={!canAddTourismGuest}
      showCheckIn={Boolean(tenantSlug) && !access.accessGranted && !stayEnded}
      onCheckIn={requestGrantAccess}
      checkInDisabled={primaryGrantBlocked}
      checkInHint={
        primaryGrantBlocked
          ? 'Complete tourism registration and upload passport photos before check-in.'
          : null
      }
      checkInError={access.actionError}
      showGrantAccess={
        activeTab === 'access' && Boolean(tenantSlug) && !access.accessGranted && !stayEnded
      }
      onGrantAccess={requestGrantAccess}
      grantAccessDisabled={primaryGrantBlocked}
    />
  );

  const tabsList = (
    <TabsList variant="line" className="w-full justify-start">
      <TabsTrigger value="stay">Stay</TabsTrigger>
      {showTourismTab ? (
        <TabsTrigger value="tourism" className="inline-flex items-center gap-1.5">
          Tourism
          <StayDetailTabToneDot tone={tourismTabTone} />
        </TabsTrigger>
      ) : null}
      <TabsTrigger value="access" className="inline-flex items-center gap-1.5">
        Access
        <StayDetailTabToneDot tone={accessTabTone} />
      </TabsTrigger>
    </TabsList>
  );

  const tabsBody = (
    <>
      <TabsContent value="stay" className="mt-0 space-y-4 outline-none">
        <StayBookingComOpenBlock stay={stay} tenantSettings={tenantSettings} />
        {tenantSlug ? (
          <>
            <StayBookingBalanceBlock
              stay={stay}
              tenantSlug={tenantSlug}
              onStayUpdated={onStayBookingBalanceChange}
            />
            <StayReceptionNoteBlock
              stay={stay}
              tenantSlug={tenantSlug}
              onStayUpdated={onReceptionNoteChange}
            />
            <StayRoomKeyBlock
              accessGranted={access.accessGranted}
              keyIssued={access.keyIssued}
              keyIssuedAt={stay.key_issued_at}
              isPending={access.isPending}
              actionError={access.actionError}
              readOnly={stayEnded}
              onToggle={access.setKeyIssuedChecked}
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Stay actions unavailable.</p>
        )}
      </TabsContent>

      {showTourismTab ? (
        <TabsContent value="tourism" className="mt-0 outline-none">
          {activeTab === 'tourism' && tenantSlug ? (
            <StayTourismRegistrationBlock
              stay={stay}
              tenantSlug={tenantSlug}
              reviewOnly={stayEnded}
              onTourismExportedAtChange={onTourismExportedAtChange}
              onTourismStatusChange={setTourismStatus}
              onTourismAccessReadyChange={setTourismAccessReady}
              onAddGuestControlsChange={handleTourismAddGuestControlsChange}
            />
          ) : null}
        </TabsContent>
      ) : null}

      <TabsContent value="access" className="mt-0 space-y-4 outline-none">
        {tenantSlug ? (
          access.accessGranted ? (
            <p className="text-sm font-medium text-emerald-800">Access granted</p>
          ) : null
        ) : (
          <p className="text-xs text-muted-foreground">Access actions unavailable.</p>
        )}

        {!stay.magicLinkUrl ? (
          <p className="text-xs text-muted-foreground">
            {stayEnded ? 'Link unavailable.' : 'Link unavailable — re-issue access.'}
          </p>
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
            deskQrFocusKey={deskQrFocusKey}
          />
        )}
      </TabsContent>
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
        onEdit={stayEnded ? undefined : () => onEditStay(stay)}
        editDisabled={isPending}
        headerExtra={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!stay.magicLinkUrl || isPending}
            onClick={openDeskQr}
          >
            <QrCode />
            <span className="sr-only">Show desk QR code</span>
          </Button>
        }
        headerOverflow={
          tenantSlug ? (
            <ReceptionGuestStayDetailOverflowMenu
              stay={stay}
              isPending={isPending}
              onCancelOrCheckout={onCancelOrCheckout}
              onReissueAccess={onReissueAccess}
              onExtendStay={onExtendStay}
              operationalDate={operationalDate}
              accessGranted={access.accessGranted}
              accessPending={access.isPending}
              onRevokeAccess={access.revokeAccess}
            />
          ) : undefined
        }
      />
      <ConfirmDialog
        open={skipTourismConfirmOpen}
        title="Tourism registration incomplete"
        description="Guest tourism registration / passport photos are incomplete. Check in / grant access anyway?"
        cancelLabel="Cancel"
        confirmLabel="Continue anyway"
        confirmVariant="destructive"
        onCancel={() => setSkipTourismConfirmOpen(false)}
        onConfirm={confirmSkipTourismGrant}
      />
    </Tabs>
  );
}
