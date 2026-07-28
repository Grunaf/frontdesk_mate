'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { listGuestStayBedIds, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { stayOverlapsBedNightRange } from '@/entities/guest-stay/lib/guestAccessIntervals';
import type { TenantSettings } from '@/entities/tenant';
import {
  listLaundryMachines,
  listReceptionBookingPlatforms,
  listStayOffers,
  resolveGuestAccessMessageTemplate,
  resolveGuestAccessPinMissingText,
  resolvePlanStayStatusEnabled,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import {
  listReceptionStayOfferOptions,
  pickAvailableBedsForStayOffer,
  resolveOfferIdForBed,
} from '../lib/pickAvailableBedForStayOffer';
import {
  countDormFreeBeds,
  findPrivateRoomOfferForParty,
  maxEmptyRoomCapacityForOffer,
  resolveGlobalPartyCapacity,
} from '../lib/resolveReceptionPartyPlacement';
import { resolveReceptionOfferBalance } from '../lib/resolveReceptionOfferBalance';
import { listWholeRoomBlockedBedIdsForDateRange } from '../lib/resolveRoomOccupancyBlocks';
import { resolveStayOfferBookingUnit } from '@/entities/tenant/model/stayOffers';
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
import { runWithPreservedWindowScroll } from '@/shared/lib/preserveWindowScroll';
import type {
  HousekeepingBedStatus,
  HousekeepingLaundryProgram,
  HousekeepingLaundryRunRecord,
  HousekeepingRoomStatus,
  HousekeepingStayPresenceStatus,
} from '@/entities/housekeeping';
import {
  createGuestStayPartyAction,
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
import { ReceptionCleaningPanel, resolveNextCheckInByBedId } from '@/features/reception-cleaning';
import {
  coerceDeskTab,
  isBookingsContextTab,
  resolveActivePrimaryNav,
  resolveBottomNavItems,
  resolveBookingsContextTabs,
  resolveDefaultDeskTab,
  resolveDeskTabForPrimaryNav,
  resolveMoreBadgeCount,
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
import {
  RECEPTION_PLAN_TOOLBAR_SLOT_ID,
  RECEPTION_STICKY_CHROME_SURFACE,
  RECEPTION_STICKY_CHROME_Z,
} from '../lib/receptionStickyChrome';
import { ReceptionMoreMenu } from './ReceptionMoreMenu';
import { ReceptionMySchedulePanel } from './ReceptionMySchedulePanel';
import { ReceptionDeskHeader } from './ReceptionDeskHeader';
import { prefetchMyReceptionSchedule } from '../lib/myReceptionScheduleCache';
import { ReissueAccessDialog } from './ReissueAccessDialog';
import { ReceptionGuestStayDetail } from './ReceptionGuestStayDetail';
import { CancelBookingDialog } from './RevokeAccessDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger, ConfirmDialog } from '@/shared/ui';
import { ReceptionPushOptIn } from '@/features/reception-pwa';
import type { ReceptionOperationalContext } from '@/features/reception-sync/model/types';
import { FALLBACK_RECEPTION_ACTOR_LABEL } from '@/features/reception-sync/model/types';
import {
  useReceptionOperationalRollover,
  useReceptionOperationalSync,
  useReceptionOperationalPolling,
  subscribeReceptionRefresh,
} from '@/features/reception-sync';
import { cn } from '@/shared/lib/utils';

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

function pickDefaultBedIds(
  count: number,
  bedOptions: string[],
  unavailableBedIds: Set<string>
): string[] {
  const free = bedOptions.filter((id) => !unavailableBedIds.has(id));
  return free.slice(0, Math.max(0, count));
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
  const moreBadgeCount = resolveMoreBadgeCount(
    staffPermissions,
    openIssues.length,
    openTransfers.length
  );

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

  useEffect(() => {
    if (!(canCheckIn || canClean)) return;
    if (!moreMenuOpen && deskTab !== 'schedule') return;
    prefetchMyReceptionSchedule(tenantSlug);
  }, [moreMenuOpen, deskTab, tenantSlug, canCheckIn, canClean]);

  const [lastBookingsTab, setLastBookingsTab] = useState<BookingsContextTab>('plan');
  const [planBedFilter, setPlanBedFilter] = useState<PlanBedFilter>('all');
  const [planFocusToken, setPlanFocusToken] = useState(0);
  const showBookingsContextTabs =
    shouldShowBookingsContextTabs(deskTab) && bookingsContextTabs.length > 0;

  const [mode, setMode] = useState<GuestAccessFormMode>('custom');
  const [guestName, setGuestName] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [bookingPlatformId, setBookingPlatformId] = useState('');
  const [bookingExternalId, setBookingExternalId] = useState('');
  const [bookingAmountDue, setBookingAmountDue] = useState('');
  const [bookingAmountTouched, setBookingAmountTouched] = useState(false);
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
    runWithPreservedWindowScroll(() => {
      setBedStatuses(maps.beds);
      setRoomStatuses(maps.rooms);
      setActiveLaundryRuns(maps.activeLaundryRuns);
      setPresenceByStayId(maps.presenceByStayId);
    });
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

  const cleaningNextCheckInByBedId = useMemo(
    () => resolveNextCheckInByBedId(planStays, operational.operationalDate),
    [planStays, operational.operationalDate]
  );

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

  const handleSetBedStatuses = useCallback(
    (updates: Record<string, HousekeepingBedStatus>) => {
      const entries = Object.entries(updates);
      if (entries.length === 0) return;

      const previousByBedId: Record<string, HousekeepingBedStatus | undefined> = {};
      for (const [bedId] of entries) {
        previousByBedId[bedId] = bedStatuses[bedId];
      }

      setBedStatuses((current) => ({ ...current, ...updates }));
      startHousekeepingTransition(async () => {
        const results = await Promise.all(
          entries.map(async ([bedId, status]) => {
            const result = await upsertHousekeepingBedStatusAction({ tenantSlug, bedId, status });
            return { bedId, ok: result.ok };
          })
        );

        const failed = results.filter((result) => !result.ok);
        if (failed.length === 0) return;

        setBedStatuses((current) => {
          const next = { ...current };
          for (const { bedId } of failed) {
            const previous = previousByBedId[bedId];
            if (previous) next[bedId] = previous;
            else delete next[bedId];
          }
          return next;
        });
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

  const hardOverlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of bedOptions) {
      const overlaps = planStays.some((stay) => {
        if (editDraft?.stayId === stay.id) return false;
        return stayOverlapsBedNightRange(stay, id, accessPeriod.checkInAt, accessPeriod.checkOutAt);
      });
      if (overlaps) ids.add(id);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, editDraft?.stayId, planStays]);

  const wholeRoomBlockedBedIds = useMemo(
    () =>
      listWholeRoomBlockedBedIdsForDateRange({
        settings: tenantSettings,
        stays: planStays.filter((stay) => editDraft?.stayId !== stay.id),
        checkInDate,
        checkOutDate,
      }),
    [checkInDate, checkOutDate, editDraft?.stayId, planStays, tenantSettings]
  );

  /** Beds confirmed for rare per-bed booking inside an occupied whole-room unit. */
  const [wholeRoomOverrideBedIds, setWholeRoomOverrideBedIds] = useState<string[]>([]);
  const [pendingWholeRoomOverride, setPendingWholeRoomOverride] = useState<
    | { source: 'advanced'; bedId: string; index: number }
    | { source: 'plan'; bedId: string; nightDate: string }
    | null
  >(null);
  const [openAdvancedBeds, setOpenAdvancedBeds] = useState(false);

  const overlappingBedIds = useMemo(() => {
    const ids = new Set(hardOverlappingBedIds);
    const override = new Set(wholeRoomOverrideBedIds);
    for (const bedId of wholeRoomBlockedBedIds) {
      if (!override.has(bedId)) ids.add(bedId);
    }
    return ids;
  }, [hardOverlappingBedIds, wholeRoomBlockedBedIds, wholeRoomOverrideBedIds]);

  /** Advanced picker: include whole-room held beds (confirm before use); hide hard overlaps only. */
  const bedsByRoom = useMemo(
    () =>
      inventory.roomGroups
        .map((group) => ({
          roomId: group.roomId,
          roomLabel: group.roomLabel,
          beds: group.beds
            .filter((entry) => !hardOverlappingBedIds.has(entry.bedId))
            .map((entry) => ({ bedId: entry.bedId, displayLabel: entry.displayLabel })),
        }))
        .filter((group) => group.beds.length > 0),
    [hardOverlappingBedIds, inventory.roomGroups]
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
  const [guestCount, setGuestCount] = useState(1);
  const [bedIds, setBedIds] = useState<string[]>(() => [
    pickDefaultBedId(bedOptions, overlappingBedIds),
  ]);
  const bedId = bedIds[0] ?? '';

  const selectedStayOffer = useMemo(
    () => listStayOffers(tenantSettings).find((offer) => offer.id === offerId) ?? null,
    [offerId, tenantSettings]
  );
  const selectedBookingUnit = resolveStayOfferBookingUnit(selectedStayOffer);

  const dormFreeBeds = useMemo(
    () =>
      countDormFreeBeds({
        settings: tenantSettings,
        availableBedIds,
      }),
    [availableBedIds, tenantSettings]
  );

  const partyInventoryCapacity = useMemo(
    () =>
      resolveGlobalPartyCapacity({
        settings: tenantSettings,
        availableBedIds,
      }),
    [availableBedIds, tenantSettings]
  );

  const maxGuestCount = Math.max(1, partyInventoryCapacity || 1);

  const selectedOfferEmptyRoomCapacity = useMemo(
    () =>
      selectedBookingUnit === 'room'
        ? maxEmptyRoomCapacityForOffer({
            settings: tenantSettings,
            offerId,
            availableBedIds,
          })
        : null,
    [availableBedIds, offerId, selectedBookingUnit, tenantSettings]
  );

  const [guestsReducedMessage, setGuestsReducedMessage] = useState<string | null>(null);

  const privateRoomCtaOfferId = useMemo(() => {
    if (editDraft || selectedBookingUnit !== 'bed') return null;
    if (guestCount <= dormFreeBeds) return null;
    return findPrivateRoomOfferForParty({
      settings: tenantSettings,
      availableBedIds,
      guestCount,
    });
  }, [
    availableBedIds,
    dormFreeBeds,
    editDraft,
    guestCount,
    selectedBookingUnit,
    tenantSettings,
  ]);

  const bedPathNeedsPrivateRoom = Boolean(privateRoomCtaOfferId);
  const bedPathNotEnoughBeds =
    !editDraft &&
    selectedBookingUnit === 'bed' &&
    guestCount > dormFreeBeds &&
    !privateRoomCtaOfferId;
  const roomPathTooSmall =
    !editDraft &&
    selectedBookingUnit === 'room' &&
    (selectedOfferEmptyRoomCapacity ?? 0) < guestCount;
  const inventoryCapacityZero = !editDraft && partyInventoryCapacity === 0;

  useEffect(() => {
    if (guestCount > maxGuestCount) {
      setGuestCount(maxGuestCount);
      setGuestsReducedMessage(
        `Guests reduced to ${maxGuestCount} — fewer beds for these dates.`
      );
    }
  }, [guestCount, maxGuestCount]);

  const preferredDefaultOfferId = useMemo(() => {
    const dorm = stayOfferOptions.find((option) => option.bookingUnit === 'bed');
    return dorm?.id ?? stayOfferOptions[0]?.id ?? '';
  }, [stayOfferOptions]);

  useEffect(() => {
    if (stayOfferOptions.length === 0) return;
    if (offerId && stayOfferOptions.some((option) => option.id === offerId)) return;
    setOfferId(preferredDefaultOfferId);
  }, [offerId, preferredDefaultOfferId, stayOfferOptions]);

  useEffect(() => {
    if (editDraft?.intent === 'moveBed' && bedPickMode === 'manual') {
      if (bedId && !overlappingBedIds.has(bedId)) return;
    }

    if (bedPickMode === 'manual') {
      setBedIds((current) => {
        const next = current.map((id) => (id && !overlappingBedIds.has(id) ? id : ''));
        if (next.every((id, index) => id === current[index])) return current;
        return next;
      });
      return;
    }

    const count = editDraft ? 1 : guestCount;
    let picked: string[];
    if (stayOfferOptions.length > 0) {
      picked = pickAvailableBedsForStayOffer({
        settings: tenantSettings,
        offerId,
        availableBedIds,
        count,
      });
    } else {
      picked = pickDefaultBedIds(count, bedOptions, overlappingBedIds);
    }

    const next = picked.length > 0 ? picked : Array.from({ length: count }, () => '');
    setBedIds((current) =>
      current.length === next.length && current.every((id, index) => id === next[index])
        ? current
        : next
    );
  }, [
    availableBedIds,
    bedId,
    bedOptions,
    bedPickMode,
    editDraft,
    guestCount,
    offerId,
    overlappingBedIds,
    stayOfferOptions.length,
    tenantSettings,
    // bedIds intentionally omitted — compare-before-set avoids loops
  ]);

  useEffect(() => {
    if (editDraft || bookingAmountTouched) return;
    const prefill = resolveReceptionOfferBalance({
      settings: tenantSettings,
      offer: selectedStayOffer,
      checkInDate,
      checkOutDate,
      guestCount,
    });
    setBookingAmountDue(prefill ?? '');
  }, [
    bookingAmountTouched,
    checkInDate,
    checkOutDate,
    editDraft,
    guestCount,
    selectedStayOffer,
    tenantSettings,
  ]);

  const handleOfferIdChange = useCallback((nextOfferId: string) => {
    setOfferId(nextOfferId);
    setBedPickMode('auto');
    setBookingAmountTouched(false);
    setWholeRoomOverrideBedIds([]);
    setPendingWholeRoomOverride(null);
    setOpenAdvancedBeds(false);
  }, []);

  const applyBedIdAtIndex = useCallback((index: number, nextBedId: string) => {
    setBedIds((current) => {
      const next = [...current];
      while (next.length <= index) next.push('');
      next[index] = nextBedId;
      return next;
    });
    setBedPickMode('manual');
  }, []);

  const requestBedIdAtIndex = useCallback(
    (index: number, nextBedId: string) => {
      if (
        nextBedId &&
        wholeRoomBlockedBedIds.has(nextBedId) &&
        !wholeRoomOverrideBedIds.includes(nextBedId)
      ) {
        setPendingWholeRoomOverride({ source: 'advanced', bedId: nextBedId, index });
        return;
      }
      applyBedIdAtIndex(index, nextBedId);
    },
    [applyBedIdAtIndex, wholeRoomBlockedBedIds, wholeRoomOverrideBedIds]
  );

  const handleBedIdChange = useCallback(
    (nextBedId: string) => {
      requestBedIdAtIndex(0, nextBedId);
    },
    [requestBedIdAtIndex]
  );

  const handleBedIdAtIndexChange = useCallback(
    (index: number, nextBedId: string) => {
      requestBedIdAtIndex(index, nextBedId);
    },
    [requestBedIdAtIndex]
  );

  const confirmWholeRoomOverride = useCallback(() => {
    if (!pendingWholeRoomOverride) return;

    if (pendingWholeRoomOverride.source === 'advanced') {
      const { bedId: nextBedId, index } = pendingWholeRoomOverride;
      setWholeRoomOverrideBedIds((current) =>
        current.includes(nextBedId) ? current : [...current, nextBedId]
      );
      applyBedIdAtIndex(index, nextBedId);
      setPendingWholeRoomOverride(null);
      return;
    }

    const { bedId: nextBedId, nightDate } = pendingWholeRoomOverride;
    setWholeRoomOverrideBedIds((current) =>
      current.includes(nextBedId) ? current : [...current, nextBedId]
    );
    setMode('custom');
    setCheckInDate(nightDate);
    setCheckOutDate(addNights(nightDate, 1));
    setBedIds([nextBedId]);
    setGuestCount(1);
    setOfferId(resolveOfferIdForBed(tenantSettings, nextBedId) ?? '');
    setBedPickMode('manual');
    setOpenAdvancedBeds(true);
    setBookingAmountTouched(false);
    setPendingWholeRoomOverride(null);
    setIssueOverlayOpen(true);
  }, [applyBedIdAtIndex, pendingWholeRoomOverride, tenantSettings]);

  const cancelWholeRoomOverride = useCallback(() => {
    setPendingWholeRoomOverride(null);
  }, []);

  const handleSelectBlockedNight = useCallback(
    (nextBedId: string, nightDate: string) => {
      if (editDraft) return;
      setPendingWholeRoomOverride({ source: 'plan', bedId: nextBedId, nightDate });
    },
    [editDraft]
  );

  const handleGuestCountChange = useCallback(
    (nextCount: number) => {
      setGuestCount(Math.max(1, Math.min(maxGuestCount, nextCount)));
      setGuestsReducedMessage(null);
      setBedPickMode('auto');
      setBookingAmountTouched(false);
    },
    [maxGuestCount]
  );

  const handleBookPrivateRoom = useCallback(() => {
    if (!privateRoomCtaOfferId) return;
    setOfferId(privateRoomCtaOfferId);
    setBedPickMode('auto');
    setBookingAmountTouched(false);
    setWholeRoomOverrideBedIds([]);
    setPendingWholeRoomOverride(null);
    setOpenAdvancedBeds(false);
    setGuestsReducedMessage(null);
  }, [privateRoomCtaOfferId]);

  const resetCreateIssueForm = useCallback(() => {
    setError(null);
    const nextDates = defaultWalkInDates();
    setMode('custom');
    setCheckInDate(nextDates.checkInDate);
    setCheckOutDate(nextDates.checkOutDate);
    setGuestName('');
    setSelectedGuestId(null);
    setBookingPlatformId('');
    setBookingExternalId('');
    setBookingAmountDue('');
    setBookingAmountTouched(false);
    setGuestCount(1);
    setBedPickMode('auto');
    setWholeRoomOverrideBedIds([]);
    setPendingWholeRoomOverride(null);
    setOpenAdvancedBeds(false);
    setOfferId(preferredDefaultOfferId);
    if (stayOfferOptions.length > 0) {
      const picked = pickAvailableBedsForStayOffer({
        settings: tenantSettings,
        offerId: preferredDefaultOfferId,
        availableBedIds,
        count: 1,
      });
      setBedIds(picked.length > 0 ? picked : ['']);
    } else {
      setBedIds([pickDefaultBedId(bedOptions, overlappingBedIds)]);
    }
  }, [
    availableBedIds,
    bedOptions,
    overlappingBedIds,
    preferredDefaultOfferId,
    stayOfferOptions,
    tenantSettings,
  ]);

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
      case 'guest_not_found':
        return 'Selected guest was not found — pick again or create a new booking name.';
      case 'duplicate_bed':
        return 'Each guest needs a different bed.';
      case 'empty_party':
        return 'Add at least one guest.';
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
    setSelectedGuestId(stay.guest_id ?? null);
    setBookingPlatformId(platformId);
    setBookingExternalId(externalId);
    setBookingAmountDue(balanceDue);
    setBookingAmountTouched(true);
    setCheckInDate(toDateInput(stay.check_in_date || stay.check_in_at));
    setCheckOutDate(toDateInput(stay.check_out_date || stay.check_out_at));
    setBedIds([stay.bed_id]);
    setGuestCount(1);
    setOfferId(resolveOfferIdForBed(tenantSettings, stay.bed_id) ?? '');
    setBedPickMode('manual');
    setError(null);
  };

  const beginExtendFromStay = (stay: GuestStayRecordWithLink) => {
    const checkInDate = stayRecordCheckOutDate(stay);
    const checkOutDate = addNights(checkInDate, 1);
    const platformIds = new Set(bookingPlatformOptions.map((entry) => entry.id));
    const bookingPlatformId = platformIds.has('direct')
      ? 'direct'
      : platformIds.has('walk-in')
        ? 'walk-in'
        : (bookingPlatformOptions[0]?.id ?? '');

    setEditDraft(null);
    setMode('custom');
    setGuestName(stay.guest_name ?? '');
    setBookingPlatformId(bookingPlatformId);
    setBookingExternalId('');
    setBookingAmountDue('');
    setBookingAmountTouched(false);
    setGuestCount(1);
    setCheckInDate(checkInDate);
    setCheckOutDate(checkOutDate);
    setBedIds([stay.bed_id]);
    setOfferId(resolveOfferIdForBed(tenantSettings, stay.bed_id) ?? '');
    setBedPickMode('manual');
    setError(null);
    setIssueOverlayOpen(true);
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

    if (!editDraft && guestCount > 1) {
      if (bedIds.length < guestCount || bedIds.some((id) => !id)) {
        setError('Select a bed for each guest.');
        return;
      }
      if (new Set(bedIds).size !== bedIds.length) {
        setError('Each guest needs a different bed.');
        return;
      }
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
      required: true,
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
            guestId: selectedGuestId ?? undefined,
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

        const partyBeds = guestCount > 1 ? bedIds.slice(0, guestCount) : [bedId];
        const result = await createGuestStayPartyAction({
          tenantSlug,
          guests: partyBeds.map((partyBedId, index) => ({
            bedId: partyBedId,
            guestName: index === 0 ? guestName.trim() : undefined,
            guestId: index === 0 ? selectedGuestId ?? undefined : undefined,
          })),
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

        const lead = result.stays[0];
        await refresh();
        if (lead) {
          openStayDetail(lead.stay.id, { initialTab: 'access' });
          setStayPins((current) => {
            const next = { ...current };
            for (const entry of result.stays) {
              next[entry.stay.id] = entry.guestPin;
            }
            return next;
          });
        }
        resetCreateIssueForm();
        setIssueOverlayOpen(false);
        const usedBeds = new Set(partyBeds);
        const nextAvailable = availableBedIds.filter((id) => !usedBeds.has(id));
        setBedIds(nextAvailable[0] ? [nextAvailable[0]] : ['']);
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
    setBedIds([nextBedId]);
    setGuestCount(1);
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

  const deskHeader = (
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
  );

  const stickyChromeClassName = cn(
    'sticky top-0',
    RECEPTION_STICKY_CHROME_Z,
    '-mx-4 space-y-2 border-b px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]',
    RECEPTION_STICKY_CHROME_SURFACE
  );

  return (
    <div className={`space-y-4 ${RECEPTION_BOTTOM_NAV_CONTENT_PAD}`}>
      {moreMenuOpen ? (
        <div className={stickyChromeClassName}>{deskHeader}</div>
      ) : null}

      {moreMenuOpen ? <ReceptionPushOptIn tenantSlug={tenantSlug} /> : null}

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
          partyStays={
            selectedStay.booking_group_id
              ? planStays
                  .filter((entry) => entry.booking_group_id === selectedStay.booking_group_id)
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
              : []
          }
          onSelectPartyStay={openStayDetail}
          stayPins={stayPins}
          isPending={isPending}
          hostelName={tenantName}
          guestAccessMessageTemplate={guestAccessMessageTemplate}
          guestAccessPinMissingText={guestAccessPinMissingText}
          resolveBedLabel={resolveBedLabel}
          tourismRegistrationRequired={tourismRegistrationRequired}
          tenantSlug={tenantSlug}
          staffPermissions={staffPermissions}
          tenantSettings={tenantSettings}
          operationalDate={hubSnapshot.operational.operationalDate}
          initialTab={stayDetailInitialTab}
          onTourismExportedAtChange={() => {
            void refresh();
          }}
          onStayBookingBalanceChange={() => {
            void refresh();
          }}
          onReceptionNoteChange={(stay) => {
            setSelectedStayOverride({
              ...stay,
              magicLinkUrl: stay.magicLinkUrl ?? selectedStay?.magicLinkUrl ?? null,
            });
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
          onExtendStay={(stay) => {
            closeStayDetail();
            beginExtendFromStay(stay);
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
        tenantSlug={tenantSlug}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        selectedGuestId={selectedGuestId}
        onSelectGuestProfile={(guest) => {
          setSelectedGuestId(guest.id);
          setGuestName(guest.display_name);
        }}
        onClearGuestProfile={() => setSelectedGuestId(null)}
        bookingPlatformId={bookingPlatformId}
        onBookingPlatformIdChange={setBookingPlatformId}
        bookingExternalId={bookingExternalId}
        onBookingExternalIdChange={setBookingExternalId}
        bookingPlatformOptions={bookingPlatformOptions}
        showBookingSourceFields={showBookingSourceFields}
        bookingAmountDue={bookingAmountDue}
        onBookingAmountDueChange={(value) => {
          setBookingAmountTouched(true);
          setBookingAmountDue(value);
        }}
        bookingBalanceCurrencySymbol={bookingBalanceCurrencySymbol}
        stayOfferOptions={stayOfferOptions}
        offerId={offerId}
        onOfferIdChange={handleOfferIdChange}
        bedId={bedId}
        onBedIdChange={handleBedIdChange}
        bedIds={bedIds}
        onBedIdAtIndexChange={handleBedIdAtIndexChange}
        guestCount={guestCount}
        onGuestCountChange={handleGuestCountChange}
        maxGuestCount={maxGuestCount}
        guestsReducedMessage={guestsReducedMessage}
        privateRoomCta={
          bedPathNeedsPrivateRoom
            ? { label: 'Book a private room', onClick: handleBookPrivateRoom }
            : null
        }
        placementWarning={
          inventoryCapacityZero
            ? 'No beds for these dates.'
            : bedPathNotEnoughBeds
              ? `Not enough beds for ${guestCount} guests.`
              : bedPathNeedsPrivateRoom
                ? `Only ${dormFreeBeds} dorm beds free for these dates.`
                : roomPathTooSmall
                  ? selectedOfferEmptyRoomCapacity === 0
                    ? 'No empty private room in this offer for these dates.'
                    : `This private offer only fits ${selectedOfferEmptyRoomCapacity} guests.`
                  : null
        }
        bedsByRoom={bedsByRoom}
        advancedBedOpenDefault={editDraft?.intent === 'moveBed' || openAdvancedBeds}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onDatesChange={({ checkInDate: nextFrom, checkOutDate: nextUntil }) => {
          setCheckInDate(nextFrom);
          setCheckOutDate(nextUntil);
          if (!editDraft) {
            setBookingAmountTouched(false);
            setWholeRoomOverrideBedIds([]);
            setPendingWholeRoomOverride(null);
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
          Boolean(bedId) &&
          !hardOverlappingBedIds.has(bedId) &&
          !inventoryCapacityZero &&
          !bedPathNeedsPrivateRoom &&
          !bedPathNotEnoughBeds &&
          !roomPathTooSmall &&
          (editDraft ||
            guestCount <= 1 ||
            bedIds.slice(0, guestCount).every(
              (id) => Boolean(id) && !hardOverlappingBedIds.has(id)
            )) &&
          Boolean(guestName.trim()) &&
          resolveReservationBookingBalance({
            settings: tenantSettings,
            bookingAmountDue,
            required: true,
          }).ok &&
          !validateReservationBookingSource({
            settings: tenantSettings,
            bookingPlatformId,
            bookingExternalId,
          })
        }
        isReissue={false}
        isEditingReservation={Boolean(editDraft)}
        onSubmit={handleSubmit}
      />
      ) : null}

      <ConfirmDialog
        open={pendingWholeRoomOverride !== null}
        title={
          pendingWholeRoomOverride?.source === 'plan'
            ? 'Bed held by whole-room booking'
            : 'Book another bed in this room?'
        }
        description={
          pendingWholeRoomOverride?.source === 'plan'
            ? `${resolveBedLabel(pendingWholeRoomOverride.bedId)} · ${pendingWholeRoomOverride.nightDate}. This bed is in a room already booked as a whole room for this night.`
            : 'This bed is in a room already booked as a whole room. Book another bed here anyway?'
        }
        cancelLabel="Cancel"
        confirmLabel="Book anyway"
        confirmVariant="destructive"
        onCancel={cancelWholeRoomOverride}
        onConfirm={confirmWholeRoomOverride}
      />

      <section className="min-w-0">
        {moreMenuOpen ? (
          <ReceptionMoreMenu
            items={moreMenuTabs}
            openIssuesCount={openIssues.length}
            openTransfersCount={openTransfers.length}
            onSelect={(tab) => navigateDeskTab(tab, { clearStayId: true })}
          />
        ) : (
          <Tabs value={deskTab} onValueChange={handleDeskTabChange} className="space-y-3">
            <div className={stickyChromeClassName}>
              {deskHeader}
              {showBookingsContextTabs ? (
                <TabsList variant="line" className="mb-0 w-full justify-start">
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
              {deskTab === 'plan' ? (
                <div id={RECEPTION_PLAN_TOOLBAR_SLOT_ID} className="min-w-0" />
              ) : null}
            </div>

            <ReceptionPushOptIn tenantSlug={tenantSlug} />

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
                tenantSlug={tenantSlug}
                settings={tenantSettings}
                stays={planStays}
                onViewStay={openStayDetail}
                onSelectFreeNight={handleSelectFreeNight}
                onSelectBlockedNight={canCheckIn ? handleSelectBlockedNight : undefined}
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

            {canCheckIn || canClean ? (
              <TabsContent value="schedule">
                <ReceptionMySchedulePanel
                  tenantSlug={tenantSlug}
                  isActive={deskTab === 'schedule'}
                />
              </TabsContent>
            ) : null}

            {canClean ? (
              <TabsContent value="cleaning">
                <ReceptionCleaningPanel
                  roomGroups={cleaningRoomGroups}
                  bedStatuses={bedStatuses}
                  roomStatuses={roomStatuses}
                  laundryMachines={laundryMachines}
                  activeLaundryRuns={activeLaundryRuns}
                  nextCheckInByBedId={cleaningNextCheckInByBedId}
                  operationalDate={operational.operationalDate}
                  bedPresenceByBedId={bedPresenceByBedId}
                  presenceByStayId={presenceByStayId}
                  onSetBedStatus={handleSetBedStatus}
                  onSetBedStatuses={handleSetBedStatuses}
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
