'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { GuestTourismGuest, GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';
import { stayRecordCheckInDate } from '@/entities/guest-stay';
import { guestProfileToIdentityPrefill } from '@/entities/guest';
import {
  compressImageForUpload,
  CompressImageForUploadError,
  completeTourismRegistrationForReceptionAction,
  createTourismGuestForReceptionAction,
  getTourismDocumentSignedUrlAction,
  loadTourismRegistrationForReceptionAction,
  ReceptionTourismGuestIdentityForm,
  ReceptionAddTourismGuestSheet,
  setTourismExportedAction,
  updateTourismGuestIdentityForReceptionAction,
  uploadTourismDocumentForReceptionAction,
  type ReceptionTourismGuestIdentityValues,
} from '@/features/guest-tourism-registration';
import { formatReceptionDateTime } from '../lib/guestAccessDates';
import {
  resolveTourismStatusBadge,
  tourismStatusBadgeLabel,
  type TourismStatusBadge,
} from '../lib/resolveStayDetailTabBadge';
import { getGuestProfileAction } from '../actions/receptionActions';
import { ReceptionArrivalDatesBlock } from './ReceptionArrivalDatesBlock';
import { useIsReceptionStayDetailBelowLg } from './ReceptionStayDetailShell';
import { Button, ConfirmDialog, FieldLabelHelp } from '@/shared/ui';
import { buildWhatsappMeHref } from '@/shared/lib';

export function allTourismGuestsHavePassportPhoto(guests: GuestTourismGuest[]): boolean {
  return guests.length > 0 && guests.every((guest) => guest.passport_storage_path.trim().length > 0);
}

export function isTourismReadyForAccess(registration: GuestTourismRegistrationSummary | null): boolean {
  if (!registration?.tourism_registration_completed_at) return false;
  return allTourismGuestsHavePassportPhoto(registration.guests);
}

export function StayTourismRegistrationBlock({
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
  const isBelowLg = useIsReceptionStayDetailBelowLg();
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
              guestId: stay.guest_id,
              firstName: parts[0] ?? '',
              lastName: parts.slice(1).join(' '),
            });
          }
          return;
        }
        setAddGuestPrefill({ ...identity, guestId: stay.guest_id });
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
        guestId: values.guestId,
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
                href={buildWhatsappMeHref(registration!.tourism_contact_whatsapp!) ?? undefined}
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
                        tenantSlug={tenantSlug}
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
                          guestId: guest.guest_id,
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
              tenantSlug={tenantSlug}
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
        tenantSlug={tenantSlug}
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
