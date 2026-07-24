'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayOverlapsBedNightRange } from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  listLaundryMachines,
  listReceptionBookingPlatforms,
  resolveGuestAccessMessageTemplate,
  resolveGuestAccessPinMissingText,
  resolvePlanStayStatusEnabled,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import {
  listReceptionStayOfferOptions,
  pickAvailableBedForStayOffer,
  resolveOfferIdForBed,
} from '../lib/pickAvailableBedForStayOffer';
import {
  reservationBookingSourceErrorMessage,
  validateReservationBookingSource,
} from '@/entities/guest-stay/lib/validateReservationBookingSource';
import {
  reservationBookingBalanceErrorMessage,
  resolveReservationBookingBalance,
} from '@/entities/guest-stay/lib/validateReservationBookingBalance';
import {
  formatMinorAsDecimalInput,
  formatMoneyFromMinor,
  getCurrencyDefinition,
  isCurrencyCode,
} from '@/shared/lib/currency';
import type {
  HousekeepingBedStatus,
  HousekeepingLaundryProgram,
  HousekeepingLaundryRunRecord,
  HousekeepingRoomStatus,
  HousekeepingStayPresenceStatus,
} from '@/entities/housekeeping';
import {
  createGuestStayAction,
  cancelGuestReservationAction,
  checkoutGuestReservationAction,
  reissueGuestStayAction,
  updateGuestReservationAction,
} from '../actions/receptionActions';
import {
  clearHousekeepingStayPresenceAction,
  listHousekeepingStatusesAction,
  upsertHousekeepingBedStatusAction,
  upsertHousekeepingRoomStatusAction,
  upsertHousekeepingStayPresenceAction,
} from '../actions/housekeepingActions';
import {
  cancelLaundryRunAction,
  completeLaundryRunAction,
  startLaundryRunAction,
} from '../actions/laundryActions';
import {
  receptionStaffCanCheckIn,
  receptionStaffCanClean,
} from '@/entities/reception-user';
import { ReceptionCleaningPanel } from '@/features/reception-cleaning';
import {
  coerceDeskTab,
  isBookingsContextTab,
  resolveActivePrimaryNav,
  resolveBottomNavItems,
  resolveBookingsContextTabs,
  resolveDefaultDeskTab,
  resolveDeskTabForPrimaryNav,
  resolveMoreMenuTabs,
  shouldShowBookingsContextTabs,
  type BookingsContextTab,
  type DeskTab,
  type ReceptionPrimaryNav,
} from '../lib/receptionDeskAccess';
import {
  addNights,
  defaultWalkInDates,
  type GuestAccessFormMode,
  type IssuedAccessFilter,
  isValidAccessRange,
} from '../lib/guestAccessDates';
import { resolveBedInventory, flattenBedInventory } from '../lib/resolveBedInventory';
import { resolveBedStayPresenceLinks } from '../lib/resolveBedStayPresenceLinks';
import { resolveReceptionHubSnapshot } from '../lib/resolveReceptionHubSnapshot';
import { resolveReceptionCashSnapshot } from '../lib/resolveReceptionCashSnapshot';
import type { PlanBedFilter } from '../lib/filterPlanRoomGroupsByFreeTonight';
import { resolveGuestAccessPeriod } from '../lib/resolveGuestAccessPeriod';
import { BedAccessCalendar } from './BedAccessCalendar';
import { ReceptionIssueAccessOverlay } from './ReceptionIssueAccessOverlay';
import { ReceptionIssueAccessFab } from './ReceptionIssueAccessFab';
import { ReceptionHubView } from './ReceptionHubView';
import { ReceptionCashView } from './ReceptionCashView';
import { IssuedAccessList } from './IssuedAccessList';
import { IssuesList } from './IssuesList';
import { ReceptionTransfersTab } from './ReceptionTransfersTab';
import { ReceptionArchiveTab } from './ReceptionArchiveTab';
import {
  ReceptionBottomNav,
  RECEPTION_BOTTOM_NAV_CONTENT_PAD,
} from './ReceptionBottomNav';
import { ReceptionMoreMenu } from './ReceptionMoreMenu';
import { ReceptionDeskHeader } from './ReceptionDeskHeader';
import { ReissueAccessDialog } from './ReissueAccessDialog';
import { ReceptionGuestStayDetail } from './ReceptionGuestStayDetail';
import { CancelBookingDialog } from './RevokeAccessDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
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
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const stayIdParam = searchParams.get('stayId')?.trim() ?? '';

  const { context, refresh } = useReceptionOperationalSync(initialContext, tenantSlug);
  const deskContext = context as ReceptionOperationalContext;
  const { stays, planStays: planStaysFromContext, openIssues, openTransfers, operational } =
    deskContext;
  const planStays = planStaysFromContext ?? stays;
  const signedInAsLabel = deskContext.actorDisplayName ?? FALLBACK_RECEPTION_ACTOR_LABEL;
  const staffPermissions = deskContext.staffPermissions ?? [];
  const staffPermissionsKey = staffPermissions.join(',');
  const canCheckIn = receptionStaffCanCheckIn(staffPermissions);
  const canClean = receptionStaffCanClean(staffPermissions);
  const bottomNavItems = useMemo(
    () => resolveBottomNavItems(staffPermissions),
    [staffPermissions]
  );
  const bookingsContextTabs = useMemo(
    () => resolveBookingsContextTabs(staffPermissions),
    [staffPermissions]
  );
  const moreMenuTabs = useMemo(
    () => resolveMoreMenuTabs(staffPermissions),
    [staffPermissions]
  );
  const moreBadgeCount = openIssues.length + openTransfers.length;

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
  const [deskTab, setDeskTab] = useState<DeskTab>(() =>
    resolveDefaultDeskTab(initialContext.staffPermissions)
  );
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [lastBookingsTab, setLastBookingsTab] = useState<BookingsContextTab>('plan');
  const [planBedFilter, setPlanBedFilter] = useState<PlanBedFilter>('all');
  const [planFocusToken, setPlanFocusToken] = useState(0);
  const [mode, setMode] = useState<GuestAccessFormMode>('custom');
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
  const [selectedStayOverride, setSelectedStayOverride] =
    useState<GuestStayRecordWithLink | null>(null);
  const [stayDetailInitialTab, setStayDetailInitialTab] = useState<'access' | 'stay'>('stay');
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [pendingArchiveStay, setPendingArchiveStay] = useState<{
    stayId: string;
    intent: 'cancel' | 'checkout';
  } | null>(null);
  const [pendingReissueAccessStay, setPendingReissueAccessStay] =
    useState<GuestStayRecordWithLink | null>(null);
  const [editDraft, setEditDraft] = useState<EditReservationDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const [housekeepingBusy, startHousekeepingTransition] = useTransition();
  const [bedStatuses, setBedStatuses] = useState<Record<string, HousekeepingBedStatus>>({});
  const [roomStatuses, setRoomStatuses] = useState<Record<string, HousekeepingRoomStatus>>({});
  const [presenceByStayId, setPresenceByStayId] = useState<
    Record<string, HousekeepingStayPresenceStatus>
  >({});
  const [activeLaundryRuns, setActiveLaundryRuns] = useState<HousekeepingLaundryRunRecord[]>([]);

  useEffect(() => {
    const next = coerceDeskTab(tabParam, staffPermissions);
    setDeskTab(next);
    setMoreMenuOpen(false);
    if (isBookingsContextTab(next)) {
      setLastBookingsTab(next);
    }

    if (!stayIdParam || !canCheckIn) return;
    setDeskTab('plan');
    setLastBookingsTab('plan');
    setStayDetailInitialTab('stay');
    setSelectedStayOverride(null);
    setSelectedStayId(stayIdParam);
    // staffPermissions read for coerce; key tracks membership changes without array identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- staffPermissions via staffPermissionsKey
  }, [tabParam, stayIdParam, staffPermissionsKey, canCheckIn]);

  const rangeValid = isValidAccessRange(checkInDate, checkOutDate);

  const loadHousekeepingStatuses = useCallback(async () => {
    const maps = await listHousekeepingStatusesAction(tenantSlug);
    setBedStatuses(maps.beds);
    setRoomStatuses(maps.rooms);
    setActiveLaundryRuns(maps.activeLaundryRuns);
    setPresenceByStayId(maps.presenceByStayId);
  }, [tenantSlug]);

  useEffect(() => {
    const tracksHousekeeping =
      deskTab === 'plan' || deskTab === 'cleaning' || deskTab === 'desk';
    if (!tracksHousekeeping) return;

    void loadHousekeepingStatuses();

    const HOUSEKEEPING_POLL_MS = 45_000;
    const pollId = window.setInterval(() => {
      void loadHousekeepingStatuses();
    }, HOUSEKEEPING_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadHousekeepingStatuses();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [deskTab, loadHousekeepingStatuses]);

  const navigateDeskTab = useCallback(
    (value: string, options?: { clearStayId?: boolean }) => {
      const next = coerceDeskTab(value, staffPermissions);
      setDeskTab(next);
      setMoreMenuOpen(false);
      if (isBookingsContextTab(next)) {
        setLastBookingsTab(next);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      if (options?.clearStayId) {
        params.delete('stayId');
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams, staffPermissions]
  );

  const openPlanFreeBeds = useCallback(() => {
    if (!canCheckIn) return;
    setPlanBedFilter('free_tonight');
    setPlanFocusToken((token) => token + 1);
    navigateDeskTab('plan');
  }, [canCheckIn, navigateDeskTab]);

  const cleaningRoomGroups = useMemo(() => {
    const inventory = resolveBedInventory(tenantSettings, [], {
      nightDate: operational.operationalDate,
    });
    return inventory.roomGroups.map((group) => ({
      roomId: group.roomId,
      roomLabel: group.roomLabel,
      beds: group.beds.map((bed) => ({
        bedId: bed.bedId,
        displayLabel: bed.displayLabel,
      })),
    }));
  }, [tenantSettings, operational.operationalDate]);

  const bedPresenceByBedId = useMemo(
    () => resolveBedStayPresenceLinks(planStays, operational.operationalDate),
    [planStays, operational.operationalDate]
  );

  const handleDeskTabChange = useCallback(
    (value: string) => {
      navigateDeskTab(value, { clearStayId: true });
    },
    [navigateDeskTab]
  );

  const activePrimaryNav = resolveActivePrimaryNav({
    deskTab,
    moreMenuOpen,
    permissions: staffPermissions,
  });

  const handlePrimaryNavSelect = useCallback(
    (item: ReceptionPrimaryNav) => {
      if (item === 'more') {
        setMoreMenuOpen(true);
        return;
      }
      const next = resolveDeskTabForPrimaryNav(item, staffPermissions, lastBookingsTab);
      if (next) {
        navigateDeskTab(next, { clearStayId: true });
      }
    },
    [lastBookingsTab, navigateDeskTab, staffPermissions]
  );

  const handleSetBedStatus = useCallback(
    (bedId: string, status: HousekeepingBedStatus) => {
      const previous = bedStatuses[bedId];
      setBedStatuses((current) => ({ ...current, [bedId]: status }));
      startHousekeepingTransition(async () => {
        const result = await upsertHousekeepingBedStatusAction({ tenantSlug, bedId, status });
        if (!result.ok) {
          setBedStatuses((current) => {
            const next = { ...current };
            if (previous) next[bedId] = previous;
            else delete next[bedId];
            return next;
          });
        }
      });
    },
    [bedStatuses, tenantSlug]
  );

  const handleSetRoomStatus = useCallback(
    (roomId: string, status: HousekeepingRoomStatus) => {
      const previous = roomStatuses[roomId];
      setRoomStatuses((current) => ({ ...current, [roomId]: status }));
      startHousekeepingTransition(async () => {
        const result = await upsertHousekeepingRoomStatusAction({ tenantSlug, roomId, status });
        if (!result.ok) {
          setRoomStatuses((current) => {
            const next = { ...current };
            if (previous) next[roomId] = previous;
            else delete next[roomId];
            return next;
          });
        }
      });
    },
    [roomStatuses, tenantSlug]
  );

  const handleSetPresence = useCallback(
    (stayId: string, bedId: string, status: HousekeepingStayPresenceStatus) => {
      const previous = presenceByStayId[stayId];
      setPresenceByStayId((current) => ({ ...current, [stayId]: status }));
      startHousekeepingTransition(async () => {
        const result = await upsertHousekeepingStayPresenceAction({
          tenantSlug,
          stayId,
          bedId,
          status,
        });
        if (!result.ok) {
          setPresenceByStayId((current) => {
            const next = { ...current };
            if (previous) next[stayId] = previous;
            else delete next[stayId];
            return next;
          });
        }
      });
    },
    [presenceByStayId, tenantSlug]
  );

  const handleClearPresence = useCallback(
    (stayId: string) => {
      const previous = presenceByStayId[stayId];
      setPresenceByStayId((current) => {
        const next = { ...current };
        delete next[stayId];
        return next;
      });
      startHousekeepingTransition(async () => {
        const result = await clearHousekeepingStayPresenceAction({ tenantSlug, stayId });
        if (!result.ok) {
          setPresenceByStayId((current) => {
            if (!previous) return current;
            return { ...current, [stayId]: previous };
          });
        }
      });
    },
    [presenceByStayId, tenantSlug]
  );

  const laundryMachines = useMemo(
    () => listLaundryMachines(tenantSettings),
    [tenantSettings]
  );

  const handleStartLaundry = useCallback(
    (machineId: string, program: HousekeepingLaundryProgram) => {
      startHousekeepingTransition(async () => {
        const result = await startLaundryRunAction({
          tenantSlug,
          machineId,
          program,
        });
        if (result.ok) {
          setActiveLaundryRuns((current) => {
            const withoutMachine = current.filter((run) => run.machine_id !== result.run.machine_id);
            return [...withoutMachine, result.run];
          });
          return;
        }
        if (result.error === 'already_running') {
          await loadHousekeepingStatuses();
        }
      });
    },
    [loadHousekeepingStatuses, tenantSlug]
  );

  const handleCompleteLaundry = useCallback(
    (runId: string) => {
      const previous = activeLaundryRuns.find((run) => run.id === runId) ?? null;
      setActiveLaundryRuns((current) => current.filter((run) => run.id !== runId));
      startHousekeepingTransition(async () => {
        const result = await completeLaundryRunAction({ tenantSlug, runId });
        if (!result.ok && previous) {
          setActiveLaundryRuns((current) => [...current, previous]);
        }
      });
    },
    [activeLaundryRuns, tenantSlug]
  );

  const handleCancelLaundry = useCallback(
    (runId: string) => {
      const previous = activeLaundryRuns.find((run) => run.id === runId) ?? null;
      setActiveLaundryRuns((current) => current.filter((run) => run.id !== runId));
      startHousekeepingTransition(async () => {
        const result = await cancelLaundryRunAction({ tenantSlug, runId });
        if (!result.ok && previous) {
          setActiveLaundryRuns((current) => [...current, previous]);
        }
      });
    },
    [activeLaundryRuns, tenantSlug]
  );

  const accessPeriod = useMemo(
    () => resolveGuestAccessPeriod(checkInDate, checkOutDate, checkInTime, propertyTimeZone),
    [checkInDate, checkOutDate, checkInTime, propertyTimeZone]
  );

  const hubSnapshot = useMemo(
    () => resolveReceptionHubSnapshot(tenantSettings, planStays, new Date()),
    [tenantSettings, planStays, rolloverEpoch]
  );

  const cashSnapshot = useMemo(
    () => resolveReceptionCashSnapshot(tenantSettings, planStays, new Date()),
    [tenantSettings, planStays, rolloverEpoch]
  );

  const inventory = useMemo(
    () =>
      resolveBedInventory(tenantSettings, planStays, {
        nightDate: hubSnapshot.operational.operationalDate,
      }),
    [tenantSettings, planStays, hubSnapshot.operational.operationalDate]
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

  const selectedStay = useMemo(() => {
    if (!selectedStayId) return null;
    const fromPlan = planStays.find((stay) => stay.id === selectedStayId) ?? null;
    if (fromPlan) return fromPlan;
    const fromActive = stays.find((stay) => stay.id === selectedStayId) ?? null;
    if (fromActive) return fromActive;
    if (selectedStayOverride?.id === selectedStayId) return selectedStayOverride;
    return null;
  }, [selectedStayId, selectedStayOverride, planStays, stays]);

  const openStayDetail = useCallback((stayId: string, options?: { initialTab?: 'access' | 'stay' }) => {
    setStayDetailInitialTab(options?.initialTab ?? 'stay');
    setSelectedStayOverride(null);
    setSelectedStayId(stayId);
  }, []);

  const openStayDetailRecord = useCallback((stay: GuestStayRecordWithLink) => {
    setStayDetailInitialTab('stay');
    setSelectedStayOverride(stay);
    setSelectedStayId(stay.id);
  }, []);

  const closeStayDetail = useCallback(() => {
    setSelectedStayId(null);
    setSelectedStayOverride(null);
    setStayDetailInitialTab('stay');
  }, []);

  const overlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bedId of bedOptions) {
      const overlaps = planStays.some((stay) => {
        if (editDraft?.stayId === stay.id) return false;
        return stayOverlapsBedNightRange(stay, bedId, accessPeriod.checkInAt, accessPeriod.checkOutAt);
      });
      if (overlaps) ids.add(bedId);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, editDraft?.stayId, planStays]);

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

  const stayOfferOptions = useMemo(
    () =>
      listReceptionStayOfferOptions({
        settings: tenantSettings,
        availableBedIds,
      }),
    [availableBedIds, tenantSettings]
  );

  const [offerId, setOfferId] = useState('');
  const [bedPickMode, setBedPickMode] = useState<'auto' | 'manual'>('auto');
  const [bedId, setBedId] = useState(() => pickDefaultBedId(bedOptions, overlappingBedIds));

  useEffect(() => {
    if (stayOfferOptions.length === 0) return;
    if (offerId && stayOfferOptions.some((option) => option.id === offerId)) return;
    setOfferId(stayOfferOptions[0]?.id ?? '');
  }, [offerId, stayOfferOptions]);

  useEffect(() => {
    if (editDraft?.intent === 'moveBed' && bedPickMode === 'manual') {
      if (bedId && !overlappingBedIds.has(bedId)) return;
    }

    if (stayOfferOptions.length > 0 && bedPickMode === 'auto') {
      const picked = pickAvailableBedForStayOffer({
        settings: tenantSettings,
        offerId,
        availableBedIds,
      });
      setBedId(picked ?? '');
      return;
    }

    if (bedId && !overlappingBedIds.has(bedId)) return;
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  }, [
    availableBedIds,
    bedId,
    bedOptions,
    bedPickMode,
    editDraft?.intent,
    offerId,
    overlappingBedIds,
    stayOfferOptions.length,
    tenantSettings,
  ]);

  const handleOfferIdChange = useCallback((nextOfferId: string) => {
    setOfferId(nextOfferId);
    setBedPickMode('auto');
  }, []);

  const handleBedIdChange = useCallback((nextBedId: string) => {
    setBedId(nextBedId);
    setBedPickMode('manual');
  }, []);

  const resetCreateIssueForm = useCallback(() => {
    setError(null);
    const nextDates = defaultWalkInDates();
    setMode('custom');
    setCheckInDate(nextDates.checkInDate);
    setCheckOutDate(nextDates.checkOutDate);
    setGuestName('');
    setBookingPlatformId('');
    setBookingExternalId('');
    setBookingAmountDue('');
    setBedPickMode('auto');
    setOfferId(stayOfferOptions[0]?.id ?? '');
    if (stayOfferOptions.length > 0) {
      setBedId(
        pickAvailableBedForStayOffer({
          settings: tenantSettings,
          offerId: stayOfferOptions[0]?.id,
          availableBedIds,
        }) ?? ''
      );
    } else {
      setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
    }
  }, [availableBedIds, bedOptions, overlappingBedIds, stayOfferOptions, tenantSettings]);

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
    setOfferId(resolveOfferIdForBed(tenantSettings, stay.bed_id) ?? '');
    setBedPickMode('manual');
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    if (!guestName.trim()) {
      setError('Enter a booking name.');
      return;
    }

    if (!rangeValid) {
      setError('Valid until must be on or after valid from.');
      return;
    }

    if (!bedId) {
      setError(
        stayOfferOptions.length > 0
          ? 'No free beds in this offer for these dates.'
          : 'Select a bed'
      );
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
      required: !editDraft,
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
            guestName: guestName.trim(),
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
          guestName: guestName.trim(),
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
        openStayDetail(result.stay.id, { initialTab: 'access' });
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

  const handleCancelOrCheckout = (stayId: string, intent: 'cancel' | 'checkout') => {
    setRevokeError(null);
    const operationalDate = hubSnapshot.operational.operationalDate;

    startTransition(async () => {
      const result =
        intent === 'checkout'
          ? await checkoutGuestReservationAction({ tenantSlug, stayId, operationalDate })
          : await cancelGuestReservationAction({ tenantSlug, stayId, operationalDate });
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
      setPendingArchiveStay(null);
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
    setOfferId(resolveOfferIdForBed(tenantSettings, nextBedId) ?? '');
    setBedPickMode('manual');
    setIssueOverlayOpen(true);
  };

  if (bedOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Configure beds in Guest app modules before issuing guest access.
      </p>
    );
  }

  return (
    <div className={`space-y-4 ${RECEPTION_BOTTOM_NAV_CONTENT_PAD}`}>
      <ReceptionDeskHeader
        tenantName={tenantName}
        accountLabel={signedInAsLabel}
        showBookingSearch={canCheckIn}
        showNewBookingCta={canCheckIn}
        staysForSearch={stays}
        resolveBedLabel={resolveBedLabel}
        onFindStayByRef={openStayDetailFromRefSearch}
        onNewBooking={() => setIssueOverlayOpen(true)}
      />

      <ReceptionPushOptIn tenantSlug={tenantSlug} />

      {canCheckIn ? (
        <ReceptionIssueAccessFab
          visible={!(issueOverlayOpen || editDraft !== null)}
          onPress={() => setIssueOverlayOpen(true)}
        />
      ) : null}

      <CancelBookingDialog
        open={pendingArchiveStay !== null}
        intent={pendingArchiveStay?.intent ?? 'cancel'}
        isPending={isPending}
        onKeep={() => setPendingArchiveStay(null)}
        onConfirm={() => {
          if (pendingArchiveStay) {
            handleCancelOrCheckout(pendingArchiveStay.stayId, pendingArchiveStay.intent);
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
          operationalDate={hubSnapshot.operational.operationalDate}
          initialTab={stayDetailInitialTab}
          onTourismExportedAtChange={() => {
            void refresh();
          }}
          onStayBookingBalanceChange={() => {
            void refresh();
          }}
          onPassportCheckedAtChange={() => {
            void refresh();
          }}
          onCancelOrCheckout={(stayId, intent) => {
            setPendingArchiveStay({ stayId, intent });
          }}
          onEditStay={(stay) => {
            closeStayDetail();
            beginEditDraft(stay, 'changeDates');
          }}
          onReissueAccess={(stay) => {
            setPendingReissueAccessStay(stay);
          }}
        />
      ) : null}

      {canCheckIn ? (
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
        stayOfferOptions={stayOfferOptions}
        offerId={offerId}
        onOfferIdChange={handleOfferIdChange}
        bedId={bedId}
        onBedIdChange={handleBedIdChange}
        bedsByRoom={bedsByRoom}
        advancedBedOpenDefault={editDraft?.intent === 'moveBed'}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onDatesChange={({ checkInDate: nextFrom, checkOutDate: nextUntil }) => {
          setCheckInDate(nextFrom);
          setCheckOutDate(nextUntil);
          if (!editDraft) {
            setBedPickMode('auto');
          }
        }}
        reissueGuestLabel={editDraft?.guestName}
        editIntent={editDraft?.intent}
        onCancelReissue={editDraft ? clearEditDraft : undefined}
        error={error}
        isPending={isPending}
        rangeValid={rangeValid}
        canSubmit={
          rangeValid &&
          availableBedIds.length > 0 &&
          Boolean(bedId) &&
          Boolean(guestName.trim()) &&
          (Boolean(editDraft) ||
            resolveReservationBookingBalance({
              settings: tenantSettings,
              bookingAmountDue,
              required: true,
            }).ok)
        }
        isReissue={false}
        isEditingReservation={Boolean(editDraft)}
        onSubmit={handleSubmit}
      />
      ) : null}

      <section className="min-w-0">
        {moreMenuOpen ? (
          <ReceptionMoreMenu
            items={moreMenuTabs}
            openIssuesCount={openIssues.length}
            openTransfersCount={openTransfers.length}
            onSelect={(tab) => navigateDeskTab(tab, { clearStayId: true })}
          />
        ) : (
          <Tabs value={deskTab} onValueChange={handleDeskTabChange}>
            {shouldShowBookingsContextTabs(deskTab) && bookingsContextTabs.length > 0 ? (
              <TabsList variant="line" className="mb-4 w-full justify-start">
                {bookingsContextTabs.includes('plan') ? (
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                ) : null}
                {bookingsContextTabs.includes('access') ? (
                  <TabsTrigger value="access">Access</TabsTrigger>
                ) : null}
                {bookingsContextTabs.includes('cash') ? (
                  <TabsTrigger value="cash">Cash</TabsTrigger>
                ) : null}
              </TabsList>
            ) : null}

            {canCheckIn ? (
              <>
            <TabsContent value="desk">
              <ReceptionHubView
                snapshot={hubSnapshot}
                resolveBedLabel={resolveBedLabel}
                onViewStay={openStayDetail}
                onOpenFreeBeds={openPlanFreeBeds}
                operationalDayUpdatedNotice={operationalDayUpdatedNotice}
                presenceByStayId={presenceByStayId}
                paymentDueCallout={
                  cashSnapshot.unpaidCount > 0
                    ? {
                        unpaidCount: cashSnapshot.unpaidCount,
                        stillDueLabel: formatMoneyFromMinor(
                          cashSnapshot.stillDueMinor,
                          cashSnapshot.currency,
                          'en'
                        ),
                        leavesTomorrowCount: cashSnapshot.leavesTomorrowCount,
                        onOpenCash: () => navigateDeskTab('cash', { clearStayId: true }),
                      }
                    : null
                }
                interruptCallouts={{
                  openIssuesCount: openIssues.length,
                  openTransfersCount: openTransfers.length,
                  onOpenIssues: () => navigateDeskTab('issues', { clearStayId: true }),
                  onOpenTransfers: () => navigateDeskTab('transfers', { clearStayId: true }),
                }}
              />
            </TabsContent>

            <TabsContent value="plan">
              <BedAccessCalendar
                embedded
                settings={tenantSettings}
                stays={planStays}
                onViewStay={openStayDetail}
                onSelectFreeNight={handleSelectFreeNight}
                bedStatuses={bedStatuses}
                roomStatuses={roomStatuses}
                onSetBedStatus={handleSetBedStatus}
                onSetRoomStatus={handleSetRoomStatus}
                housekeepingBusy={housekeepingBusy}
                planStayStatusEnabled={resolvePlanStayStatusEnabled(tenantSettings)}
                planToday={hubSnapshot.operational.operationalDate}
                bedFilter={planBedFilter}
                onBedFilterChange={setPlanBedFilter}
                focusToken={planFocusToken}
              />
            </TabsContent>

            <TabsContent value="access">
              <IssuedAccessList
                stays={stays}
                filter={issuedAccessFilter}
                onFilterChange={setIssuedAccessFilter}
                onOpenStayDetail={openStayDetail}
                revokeError={revokeError}
                resolveBedLabel={resolveBedLabel}
                tenantSettings={tenantSettings}
              />
            </TabsContent>

            <TabsContent value="cash">
              <ReceptionCashView
                snapshot={cashSnapshot}
                resolveBedLabel={resolveBedLabel}
                onViewStay={openStayDetail}
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

            <TabsContent value="archive">
              <ReceptionArchiveTab
                tenantSlug={tenantSlug}
                isActive={deskTab === 'archive'}
                resolveBedLabel={resolveBedLabel}
                onOperationalRefresh={async () => {
                  await refresh();
                }}
                onOpenOriginal={(stay) => {
                  openStayDetailRecord(stay);
                }}
              />
            </TabsContent>
              </>
            ) : null}

            {canClean ? (
              <TabsContent value="cleaning">
                <ReceptionCleaningPanel
                  roomGroups={cleaningRoomGroups}
                  bedStatuses={bedStatuses}
                  roomStatuses={roomStatuses}
                  laundryMachines={laundryMachines}
                  activeLaundryRuns={activeLaundryRuns}
                  bedPresenceByBedId={bedPresenceByBedId}
                  presenceByStayId={presenceByStayId}
                  onSetBedStatus={handleSetBedStatus}
                  onSetRoomStatus={handleSetRoomStatus}
                  onSetPresence={handleSetPresence}
                  onClearPresence={handleClearPresence}
                  onStartLaundry={handleStartLaundry}
                  onCompleteLaundry={handleCompleteLaundry}
                  onCancelLaundry={handleCancelLaundry}
                  busy={housekeepingBusy}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        )}
      </section>

      <ReceptionBottomNav
        items={bottomNavItems}
        active={activePrimaryNav}
        moreBadgeCount={moreBadgeCount}
        onSelect={handlePrimaryNavSelect}
      />
    </div>
  );
}
