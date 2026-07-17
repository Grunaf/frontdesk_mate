'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayOverlapsBedNightRange } from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  resolveGuestAccessMessageTemplate,
  resolveGuestAccessPinMissingText,
  resolveTourismRegistrationRequired,
  listReceptionBookingPlatforms,
} from '@/entities/tenant';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import {
  reservationBookingSourceErrorMessage,
  validateReservationBookingSource,
} from '@/entities/guest-stay/lib/validateReservationBookingSource';
import {
  reservationBookingBalanceErrorMessage,
  resolveReservationBookingBalance,
} from '@/entities/guest-stay/lib/validateReservationBookingBalance';
import { formatMinorAsDecimalInput, getCurrencyDefinition, isCurrencyCode } from '@/shared/lib/currency';
import {
  createGuestStayAction,
  completeDeskCheckInAction,
  reissueGuestStayAction,
  revokeGuestStayAction,
  updateGuestReservationAction,
} from '../actions/receptionActions';
import {
  addNights,
  defaultWalkInDates,
  formatDisplayDate,
  type GuestAccessFormMode,
  type IssuedAccessFilter,
  isValidAccessRange,
} from '../lib/guestAccessDates';
import { resolveBedInventory, flattenBedInventory } from '../lib/resolveBedInventory';
import { resolveReceptionHubSnapshot } from '../lib/resolveReceptionHubSnapshot';
import { resolveGuestAccessPeriod } from '../lib/resolveGuestAccessPeriod';
import {
  formatReceptionDeskStats,
  resolveReceptionDeskStats,
} from '../lib/resolveReceptionDeskStats';
import { BedAccessCalendar } from './BedAccessCalendar';
import { ReceptionIssueAccessOverlay } from './ReceptionIssueAccessOverlay';
import { ReceptionIssueAccessFab } from './ReceptionIssueAccessFab';
import { RECEPTION_ISSUE_ACCESS_DESKTOP_CTA_LABEL } from './receptionIssueAccessCta';
import { ReceptionHubView } from './ReceptionHubView';
import { IssuedAccessList } from './IssuedAccessList';
import { IssuesList } from './IssuesList';
import { ReceptionTransfersTab } from './ReceptionTransfersTab';
import { ReissueAccessDialog } from './ReissueAccessDialog';
import { ReceptionGuestStayDetail } from './ReceptionGuestStayDetail';
import { RevokeAccessDialog } from './RevokeAccessDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button } from '@/shared/ui';
import { ReceptionPushOptIn } from '@/features/reception-pwa';
import type { ReceptionOperationalContext } from '@/features/reception-sync/model/types';
import { FALLBACK_RECEPTION_ACTOR_LABEL } from '@/features/reception-sync/model/types';
import {
  useReceptionOperationalRollover,
  useReceptionOperationalSync,
  useReceptionOperationalPolling,
  subscribeReceptionRefresh,
} from '@/features/reception-sync';

interface ReceptionCheckInPanelProps {
  tenantSlug: string;
  tenantName: string;
  settings?: TenantSettings;
  initialContext: ReceptionOperationalContext;
}

interface EditReservationDraft {
  stayId: string;
  guestName: string;
  bedId: string;
  checkInDate: string;
  checkOutDate: string;
  bookingPlatformId: string;
  bookingExternalId: string;
  bookingAmountDue: string;
  intent: 'changeDates' | 'moveBed';
}

type DeskTab = 'desk' | 'plan' | 'access' | 'issues' | 'transfers';

function pickDefaultBedId(bedOptions: string[], unavailableBedIds: Set<string>): string {
  return bedOptions.find((id) => !unavailableBedIds.has(id)) ?? bedOptions[0] ?? '';
}

function toDateInput(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}

export function ReceptionCheckInPanel({
  tenantSlug,
  tenantName,
  settings,
  initialContext,
}: ReceptionCheckInPanelProps) {
  const bedOptions = useMemo(() => listGuestStayBedIds(settings ?? {}), [settings]);
  const tenantSettings = settings ?? {};
  const bookingPlatformOptions = useMemo(
    () => listReceptionBookingPlatforms(tenantSettings),
    [tenantSettings]
  );
  const showBookingSourceFields = bookingPlatformOptions.length > 0;
  const tenantCurrency = useMemo(() => resolveTenantCurrency(tenantSettings), [tenantSettings]);
  const bookingBalanceCurrencySymbol = getCurrencyDefinition(tenantCurrency.primary).symbol;
  const checkInTime = settings?.checkInTime ?? '14:00';
  const propertyTimeZone = settings?.propertyTimeZone;
  const walkInDefaults = defaultWalkInDates();

  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab === 'desk' ||
      tab === 'plan' ||
      tab === 'access' ||
      tab === 'issues' ||
      tab === 'transfers'
    ) {
      setDeskTab(tab);
    }
  }, [searchParams]);

  const { context, refresh } = useReceptionOperationalSync(initialContext, tenantSlug);
  const deskContext = context as ReceptionOperationalContext;
  const { stays, openIssues, openTransfers, operational } = deskContext;
  const signedInAsLabel = deskContext.actorDisplayName ?? FALLBACK_RECEPTION_ACTOR_LABEL;
  const [operationalDayUpdatedNotice, setOperationalDayUpdatedNotice] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeReceptionRefresh(() => {
      void refresh();
    });
  }, [refresh]);

  useReceptionOperationalPolling(refresh);

  const { rolloverEpoch } = useReceptionOperationalRollover(operational.endsAt, refresh, {
    onRollover: () => setOperationalDayUpdatedNotice(true),
  });

  useEffect(() => {
    if (!operationalDayUpdatedNotice) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setOperationalDayUpdatedNotice(false);
    }, 8000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [operationalDayUpdatedNotice]);

  const [issueOverlayOpen, setIssueOverlayOpen] = useState(false);
  const [deskTab, setDeskTab] = useState<DeskTab>('desk');
  const [mode, setMode] = useState<GuestAccessFormMode>('walk-in');
  const [guestName, setGuestName] = useState('');
  const [bookingPlatformId, setBookingPlatformId] = useState('');
  const [bookingExternalId, setBookingExternalId] = useState('');
  const [bookingAmountDue, setBookingAmountDue] = useState('');
  const [checkInDate, setCheckInDate] = useState(walkInDefaults.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(walkInDefaults.checkOutDate);
  const [issuedAccessFilter, setIssuedAccessFilter] = useState<IssuedAccessFilter>('today');
  const [error, setError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [pendingRevokeStayId, setPendingRevokeStayId] = useState<string | null>(null);
  const [pendingReissueAccessStay, setPendingReissueAccessStay] =
    useState<GuestStayRecordWithLink | null>(null);
  const [markArrivedError, setMarkArrivedError] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditReservationDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  const rangeValid = isValidAccessRange(checkInDate, checkOutDate);

  const accessPeriod = useMemo(
    () => resolveGuestAccessPeriod(checkInDate, checkOutDate, checkInTime, propertyTimeZone),
    [checkInDate, checkOutDate, checkInTime, propertyTimeZone]
  );

  const hubSnapshot = useMemo(
    () => resolveReceptionHubSnapshot(tenantSettings, stays, new Date()),
    [tenantSettings, stays, rolloverEpoch]
  );

  const inventory = useMemo(
    () =>
      resolveBedInventory(tenantSettings, stays, {
        nightDate: hubSnapshot.operational.operationalDate,
      }),
    [tenantSettings, stays, hubSnapshot.operational.operationalDate]
  );
  const guestAccessMessageTemplate = useMemo(
    () => resolveGuestAccessMessageTemplate(tenantSettings),
    [tenantSettings]
  );
  const guestAccessPinMissingText = useMemo(
    () => resolveGuestAccessPinMissingText(tenantSettings),
    [tenantSettings]
  );
  const tourismRegistrationRequired = useMemo(
    () => resolveTourismRegistrationRequired(tenantSettings),
    [tenantSettings]
  );
  const resolveBedLabel = useCallback(
    (bedId: string) => {
      const match = flattenBedInventory(inventory).find((entry) => entry.bedId === bedId);
      return match?.displayLabel ?? bedId;
    },
    [inventory]
  );
  const deskStats = useMemo(
    () => formatReceptionDeskStats(resolveReceptionDeskStats(tenantSettings, stays)),
    [tenantSettings, stays]
  );

  const selectedStay = useMemo(
    () => (selectedStayId ? stays.find((stay) => stay.id === selectedStayId) ?? null : null),
    [selectedStayId, stays]
  );

  const openStayDetail = useCallback((stayId: string) => {
    setMarkArrivedError(null);
    setSelectedStayId(stayId);
  }, []);

  const closeStayDetail = useCallback(() => {
    setSelectedStayId(null);
  }, []);

  const overlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bedId of bedOptions) {
      const overlaps = stays.some((stay) => {
        if (editDraft?.stayId === stay.id) return false;
        return stayOverlapsBedNightRange(stay, bedId, accessPeriod.checkInAt, accessPeriod.checkOutAt);
      });
      if (overlaps) ids.add(bedId);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, editDraft?.stayId, stays]);

  const bedsByRoom = useMemo(
    () =>
      inventory.roomGroups
        .map((group) => ({
          roomId: group.roomId,
          roomLabel: group.roomLabel,
          beds: group.beds
            .filter((entry) => !overlappingBedIds.has(entry.bedId))
            .map((entry) => ({ bedId: entry.bedId, displayLabel: entry.displayLabel })),
        }))
        .filter((group) => group.beds.length > 0),
    [inventory.roomGroups, overlappingBedIds]
  );

  const availableBedIds = useMemo(
    () => bedOptions.filter((id) => !overlappingBedIds.has(id)),
    [bedOptions, overlappingBedIds]
  );

  const [bedId, setBedId] = useState(() => pickDefaultBedId(bedOptions, overlappingBedIds));

  useEffect(() => {
    if (bedId && !overlappingBedIds.has(bedId)) return;
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  }, [bedId, bedOptions, overlappingBedIds]);

  const resetCreateIssueForm = useCallback(() => {
    setError(null);
    const nextDates = defaultWalkInDates();
    setMode('walk-in');
    setCheckInDate(nextDates.checkInDate);
    setCheckOutDate(nextDates.checkOutDate);
    setGuestName('');
    setBookingPlatformId('');
    setBookingExternalId('');
    setBookingAmountDue('');
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  }, [bedOptions, overlappingBedIds]);

  const clearEditDraft = useCallback(() => {
    setEditDraft(null);
    setIssueOverlayOpen(false);
    resetCreateIssueForm();
  }, [resetCreateIssueForm]);

  const closeIssueOverlay = useCallback(() => {
    if (editDraft) {
      clearEditDraft();
      return;
    }
    resetCreateIssueForm();
    setIssueOverlayOpen(false);
  }, [editDraft, clearEditDraft, resetCreateIssueForm]);

  const handleModeChange = (nextMode: GuestAccessFormMode) => {
    if (editDraft) return;
    setMode(nextMode);
    if (nextMode === 'walk-in') {
      const nextDates = defaultWalkInDates();
      setCheckInDate(nextDates.checkInDate);
      setCheckOutDate(nextDates.checkOutDate);
    }
  };

  const createErrorMessage = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return 'Session expired — sign in again at reception desk.';
      case 'access_overlap':
        return 'Another guest access overlaps these dates on this bed.';
      case 'bed_not_found':
        return 'Bed not found in room map configuration.';
      case 'tenant_not_found':
        return 'Hostel not found.';
      case 'not_found':
        return 'Access not found or already revoked.';
      case 'already_revoked':
        return 'Access was revoked — cannot mark arrival.';
      case 'invalid_booking_source':
        return 'Check booking platform and reference.';
      case 'invalid_booking_balance':
        return 'Enter a valid stay balance amount (0 or greater).';
      case 'no_balance_recorded':
        return 'No stay balance recorded for this reservation.';
      case 'db_unavailable':
        return 'Database unavailable. Run migrations and check SUPABASE_SECRET_KEY.';
      case 'unknown':
        return 'Something went wrong. Try again or check the server logs.';
      default:
        return code;
    }
  };

  const beginEditDraft = (
    stay: GuestStayRecordWithLink,
    intent: EditReservationDraft['intent']
  ) => {
    const platformId = stay.booking_platform_id ?? '';
    const externalId = stay.booking_external_id ?? '';
    const balanceDue =
      stay.booking_amount_due_minor != null &&
      stay.booking_amount_currency &&
      isCurrencyCode(stay.booking_amount_currency)
        ? formatMinorAsDecimalInput(stay.booking_amount_due_minor, stay.booking_amount_currency)
        : '';
    setEditDraft({
      stayId: stay.id,
      guestName: stay.guest_name ?? '',
      bedId: stay.bed_id,
      checkInDate: toDateInput(stay.check_in_date || stay.check_in_at),
      checkOutDate: toDateInput(stay.check_out_date || stay.check_out_at),
      bookingPlatformId: platformId,
      bookingExternalId: externalId,
      bookingAmountDue: balanceDue,
      intent,
    });
    setMode('custom');
    setGuestName(stay.guest_name ?? '');
    setBookingPlatformId(platformId);
    setBookingExternalId(externalId);
    setBookingAmountDue(balanceDue);
    setCheckInDate(toDateInput(stay.check_in_date || stay.check_in_at));
    setCheckOutDate(toDateInput(stay.check_out_date || stay.check_out_at));
    setBedId(stay.bed_id);
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    if (!rangeValid) {
      setError('Valid until must be on or after valid from.');
      return;
    }

    if (!bedId) {
      setError('Select a bed');
      return;
    }

    const bookingValidation = validateReservationBookingSource({
      settings: tenantSettings,
      bookingPlatformId,
      bookingExternalId,
    });
    if (bookingValidation) {
      setError(reservationBookingSourceErrorMessage(bookingValidation));
      return;
    }

    const balanceValidation = resolveReservationBookingBalance({
      settings: tenantSettings,
      bookingAmountDue,
    });
    if (!balanceValidation.ok) {
      setError(reservationBookingBalanceErrorMessage(balanceValidation.error));
      return;
    }

    if (editDraft?.intent === 'moveBed' && bedId === editDraft.bedId) {
      setError('Choose a different bed to move this guest.');
      return;
    }

    startTransition(async () => {
      try {
        if (editDraft) {
          const result = await updateGuestReservationAction({
            tenantSlug,
            stayId: editDraft.stayId,
            bedId,
            guestName: guestName.trim() || undefined,
            checkInDate,
            checkOutDate,
            bookingPlatformId: bookingPlatformId || undefined,
            bookingExternalId: bookingExternalId.trim() || undefined,
            bookingAmountDue,
          });

          if (!result.ok) {
            setError(createErrorMessage(result.error));
            if (result.error === 'access_overlap') {
              await refresh();
            }
            return;
          }

          await refresh();
          openStayDetail(result.stay.id);
          clearEditDraft();
          return;
        }

        const result = await createGuestStayAction({
          tenantSlug,
          bedId,
          guestName: guestName.trim() || undefined,
          checkInDate,
          checkOutDate,
          bookingPlatformId: bookingPlatformId || undefined,
          bookingExternalId: bookingExternalId.trim() || undefined,
          bookingAmountDue,
        });

        if (!result.ok) {
          setError(createErrorMessage(result.error));
          if (result.error === 'access_overlap') {
            await refresh();
          }
          return;
        }

        await refresh();
        openStayDetail(result.stay.id);
        setStayPins((current) => ({ ...current, [result.stay.id]: result.guestPin }));
        resetCreateIssueForm();
        setIssueOverlayOpen(false);
        const nextAvailable = availableBedIds.filter((id) => id !== bedId);
        setBedId(nextAvailable[0] ?? '');
      } catch {
        setError('Something went wrong. Try again or check the server logs.');
      }
    });
  };

  const handleReissueAccess = (stayId: string) => {
    setError(null);

    startTransition(async () => {
      const result = await reissueGuestStayAction({ tenantSlug, stayId });
      if (!result.ok) {
        setError(createErrorMessage(result.error));
        return;
      }

      await refresh();
      openStayDetail(stayId);
      setStayPins((current) => ({ ...current, [stayId]: result.guestPin }));
      setPendingReissueAccessStay(null);
    });
  };

  const handleMarkArrived = ({ stayId, keyIssued }: { stayId: string; keyIssued: boolean }) => {
    setMarkArrivedError(null);

    startTransition(async () => {
      const result = await completeDeskCheckInAction({ tenantSlug, stayId, keyIssued });
      if (!result.ok) {
        setMarkArrivedError(createErrorMessage(result.error));
        return;
      }

      await refresh();
    });
  };

  const handleRevoke = (stayId: string) => {
    setRevokeError(null);

    startTransition(async () => {
      const result = await revokeGuestStayAction({ tenantSlug, stayId });
      if (!result.ok) {
        setRevokeError(result.error);
        return;
      }

      await refresh();
      setStayPins((current) => {
        const next = { ...current };
        delete next[stayId];
        return next;
      });
      if (selectedStayId === stayId) {
        closeStayDetail();
      }
      if (editDraft?.stayId === stayId) {
        clearEditDraft();
      }
      setPendingRevokeStayId(null);
    });
  };

  const openStayDetailFromRefSearch = (stayId: string) => {
    setIssuedAccessFilter('all');
    openStayDetail(stayId);
  };

  const handleSelectFreeNight = (nextBedId: string, nightDate: string) => {
    if (editDraft) return;
    setMode('custom');
    setCheckInDate(nightDate);
    setCheckOutDate(addNights(nightDate, 1));
    setBedId(nextBedId);
    setIssueOverlayOpen(true);
  };

  const bedsAvailabilityHint = rangeValid
    ? availableBedIds.length === 0
      ? `No beds for ${formatDisplayDate(checkInDate)} – ${formatDisplayDate(checkOutDate)}`
      : `${availableBedIds.length} bed${availableBedIds.length === 1 ? '' : 's'} available for ${formatDisplayDate(checkInDate)} – ${formatDisplayDate(checkOutDate)}`
    : null;

  if (bedOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Configure beds in Guest app modules before issuing guest access.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reception desk</p>
          <h1 className="truncate text-xl font-semibold">{tenantName}</h1>
          <p className="text-xs text-muted-foreground">{deskStats}</p>
          <p className="text-xs text-muted-foreground">Signed in as {signedInAsLabel}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className="hidden lg:inline-flex"
            onClick={() => setIssueOverlayOpen(true)}
          >
            {RECEPTION_ISSUE_ACCESS_DESKTOP_CTA_LABEL}
          </Button>
          <form method="POST" action="/api/reception/logout">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <ReceptionPushOptIn tenantSlug={tenantSlug} />

      <ReceptionIssueAccessFab
        visible={!(issueOverlayOpen || editDraft !== null)}
        onPress={() => setIssueOverlayOpen(true)}
      />

      <RevokeAccessDialog
        open={pendingRevokeStayId !== null}
        isPending={isPending}
        onKeep={() => setPendingRevokeStayId(null)}
        onConfirm={() => {
          if (pendingRevokeStayId) {
            handleRevoke(pendingRevokeStayId);
          }
        }}
      />

      <ReissueAccessDialog
        open={pendingReissueAccessStay !== null}
        guestLabel={pendingReissueAccessStay?.guest_name ?? undefined}
        isPending={isPending}
        onCancel={() => setPendingReissueAccessStay(null)}
        onConfirm={() => {
          if (pendingReissueAccessStay) {
            handleReissueAccess(pendingReissueAccessStay.id);
          }
        }}
      />

      {selectedStay ? (
        <ReceptionGuestStayDetail
          open={selectedStay !== null}
          onClose={closeStayDetail}
          stay={selectedStay}
          stayPins={stayPins}
          isPending={isPending}
          hostelName={tenantName}
          guestAccessMessageTemplate={guestAccessMessageTemplate}
          guestAccessPinMissingText={guestAccessPinMissingText}
          resolveBedLabel={resolveBedLabel}
          tourismRegistrationRequired={tourismRegistrationRequired}
          tenantSlug={tenantSlug}
          tenantSettings={tenantSettings}
          onTourismExportedAtChange={() => {
            void refresh();
          }}
          onStayBookingBalanceChange={() => {
            void refresh();
          }}
          onRevoke={(stayId) => {
            setPendingRevokeStayId(stayId);
          }}
          onChangeDates={(stay) => {
            closeStayDetail();
            beginEditDraft(stay, 'changeDates');
          }}
          onMoveBed={(stay) => {
            closeStayDetail();
            beginEditDraft(stay, 'moveBed');
          }}
          onReissueAccess={(stay) => {
            setPendingReissueAccessStay(stay);
          }}
          onMarkArrived={handleMarkArrived}
          markArrivedError={markArrivedError}
        />
      ) : null}

      <ReceptionIssueAccessOverlay
        open={issueOverlayOpen || editDraft !== null}
        onClose={closeIssueOverlay}
        mode={mode}
        onModeChange={handleModeChange}
        modeLocked={Boolean(editDraft)}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        bookingPlatformId={bookingPlatformId}
        onBookingPlatformIdChange={setBookingPlatformId}
        bookingExternalId={bookingExternalId}
        onBookingExternalIdChange={setBookingExternalId}
        bookingPlatformOptions={bookingPlatformOptions}
        showBookingSourceFields={showBookingSourceFields}
        bookingAmountDue={bookingAmountDue}
        onBookingAmountDueChange={setBookingAmountDue}
        bookingBalanceCurrencySymbol={bookingBalanceCurrencySymbol}
        bedId={bedId}
        onBedIdChange={setBedId}
        bedsByRoom={bedsByRoom}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onDatesChange={({ checkInDate: nextFrom, checkOutDate: nextUntil }) => {
          setCheckInDate(nextFrom);
          setCheckOutDate(nextUntil);
        }}
        reissueGuestLabel={editDraft?.guestName}
        editIntent={editDraft?.intent}
        onCancelReissue={editDraft ? clearEditDraft : undefined}
        bedsAvailabilityHint={bedsAvailabilityHint}
        error={error}
        isPending={isPending}
        rangeValid={rangeValid}
        canSubmit={rangeValid && availableBedIds.length > 0 && Boolean(bedId)}
        isReissue={false}
        isEditingReservation={Boolean(editDraft)}
        onSubmit={handleSubmit}
      />

      <section className="min-w-0 rounded-xl border bg-card p-4">
          <Tabs value={deskTab} onValueChange={(value) => setDeskTab(value as DeskTab)}>
            <TabsList variant="line" className="mb-4 w-full justify-start">
              <TabsTrigger value="desk">Desk</TabsTrigger>
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="issues">
                Issues{openIssues.length > 0 ? ` (${openIssues.length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="transfers">
                Transfers{openTransfers.length > 0 ? ` (${openTransfers.length})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="desk">
              <ReceptionHubView
                snapshot={hubSnapshot}
                resolveBedLabel={resolveBedLabel}
                onViewStay={openStayDetail}
                operationalDayUpdatedNotice={operationalDayUpdatedNotice}
              />
            </TabsContent>

            <TabsContent value="plan">
              <BedAccessCalendar
                embedded
                settings={tenantSettings}
                stays={stays}
                onViewStay={openStayDetail}
                onSelectFreeNight={handleSelectFreeNight}
              />
            </TabsContent>

            <TabsContent value="access">
              <IssuedAccessList
                stays={stays}
                filter={issuedAccessFilter}
                onFilterChange={setIssuedAccessFilter}
                onOpenStayDetail={openStayDetail}
                onFindStayByRef={openStayDetailFromRefSearch}
                revokeError={revokeError}
                resolveBedLabel={resolveBedLabel}
                tenantSettings={tenantSettings}
              />
            </TabsContent>

            <TabsContent value="issues">
              <IssuesList
                tenantSlug={tenantSlug}
                openIssues={openIssues}
                onFocusStay={openStayDetail}
                isActive={deskTab === 'issues'}
                onOperationalRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="transfers">
              <ReceptionTransfersTab
                tenantSlug={tenantSlug}
                openTransfers={openTransfers}
                resolveBedLabel={resolveBedLabel}
                onFocusStay={openStayDetail}
                isActive={deskTab === 'transfers'}
                onOperationalRefresh={refresh}
              />
            </TabsContent>
          </Tabs>
      </section>
    </div>
  );
}
