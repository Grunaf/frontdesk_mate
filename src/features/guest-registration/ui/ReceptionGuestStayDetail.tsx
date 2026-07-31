'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import { formatReceptionBookingSourceSummary } from '@/entities/tenant';
import {
  checkInPartyAction,
  loadTourismRegistrationForReceptionAction,
} from '@/features/guest-tourism-registration';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import {
  stayRecordCheckInDate,
  stayRecordCheckOutDate,
  resolveShowUnlockBedAction,
  isBedReadyForGuestVisibility,
} from '@/entities/guest-stay';
import {
  resolvePartyLeadName,
  resolvePartyMemberOrdinal,
  resolvePartyMemberTitle,
  resolvePartyTitle,
} from '../lib/resolvePartyTitle';
import { formatPartySheetMeta, formatReceptionDateTime } from '../lib/guestAccessDates';
import {
  filterEligiblePartyCheckoutStays,
  isStayCheckoutOverdue,
  partyCheckoutAllOverdue,
} from '../lib/resolveStayCancelCheckoutAction';
import {
  resolveAccessTabBadge,
  resolveTourismStatusBadge,
  resolveTourismTabBadge,
  type StayDetailTabId,
  type TourismStatusBadge,
} from '../lib/resolveStayDetailTabBadge';
import { MagicLinkCard } from './MagicLinkCard';
import {
  ReceptionStayDetailShell,
  RECEPTION_STAY_DETAIL_TITLE_ID,
  useIsReceptionStayDetailBelowLg,
} from './ReceptionStayDetailShell';
import {
  StayPartyPeek,
  StayPartyMobilePanel,
  StayPartySheetTabsList,
  type PartySheetTabId,
} from './StayPartyPeek';
import { BookingGroupIcon } from './BookingGroupIcon';
import {
  StayTourismRegistrationBlock,
  isTourismReadyForAccess,
} from './StayTourismRegistrationBlock';
import {
  StayBookingSourceOpenBlock,
  StayRoomKeyBlock,
  StayBookingBalanceBlock,
  StayReceptionNoteBlock,
  StayContactBlock,
  StayPassportCheckedBlock,
  isStayAdmitted,
  resolvePartyContactStay,
} from './StayDetailStayTabBlocks';
import {
  StayDetailTabToneDot,
  ReceptionGuestStayDetailActions,
  ReceptionGuestStayDetailOverflowMenu,
} from './ReceptionGuestStayDetailChrome';
import {
  isReceptionStayPastCheckOut,
  useStayAccessControls,
} from './useStayAccessControls';
import { Badge, Button, ConfirmDialog, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
import { receptionStaffCanSkipTourismGate } from '@/entities/reception-user';
import { cn } from '@/shared/lib/utils';
import { ChevronLeft, QrCode } from 'lucide-react';

export { RECEPTION_STAY_DETAIL_TITLE_ID };

type PartyStackSlideFrom = 'left' | 'right';

function partyStackMotionClass(slideFrom: PartyStackSlideFrom): string {
  return cn(
    'animate-in fade-in-0 duration-200 motion-reduce:animate-none',
    slideFrom === 'right' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
  );
}

export interface ReceptionGuestStayDetailProps {
  open: boolean;
  onClose: () => void;
  stay: GuestStayRecordWithLink;
  /** Active stays sharing booking_group_id (includes current). */
  partyStays?: GuestStayRecordWithLink[];
  onSelectPartyStay?: (stayId: string) => void;
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
  /** Party root: check out admitted members only (opens confirm in parent). */
  onCheckoutParty: (stayIds: string[]) => void;
  /** Opens unified edit (bed + dates). Party root may pass all party stays for multi-bed edit. */
  onEditStay: (
    stay: GuestStayRecordWithLink,
    options?: {
      intent?: 'changeDates' | 'moveBed';
      partyStays?: GuestStayRecordWithLink[];
    }
  ) => void;
  onReissueAccess: (stay: GuestStayRecordWithLink) => void;
  /** Prefill new booking from this stay (extend). */
  onExtendStay: (stay: GuestStayRecordWithLink) => void;
  tenantSettings?: TenantSettings;
  /** Current operational calendar day — gates Check out vs ended stays. */
  operationalDate: string;
  /** Housekeeping status for this stay's bed (`ready` unlocks guest bed visibility). */
  bedStatus?: string;
  /** Mark bed ready from stay detail (housekeeping upsert + local status sync). */
  onMarkBedReady?: (bedId: string) => Promise<boolean>;
  /** Tab on open: after create → access; otherwise stay. */
  initialTab?: StayDetailTabId;
  /** When true (Hub/Cash party row), open mobile party root first. */
  initialPartyView?: boolean;
  /**
   * Child-origin entry (Plan / Access / …): show floating CTA on party root
   * to open this stay. Cleared after drill-in.
   */
  initialFocusStayId?: string | null;
  /**
   * In-sheet edit push (same BottomSheet). When set, replaces party/child body
   * with a horizontal slide — do not open a second sheet.
   */
  editSurface?: {
    title: string;
    header?: ReactNode;
    body: ReactNode;
    /** Top-right chrome action (e.g. Save text button). */
    chromeAction?: ReactNode;
    /** Back chevron — pop edit (may confirm if dirty). */
    onBack: () => void;
    /** Sheet dismiss while editing (may confirm if dirty, then close sheet). */
    onDismiss?: () => void;
  } | null;
  /** Block sheet dismiss (e.g. discard-changes confirm open). */
  editDismissBlocked?: boolean;
}

export function ReceptionGuestStayDetail({
  open,
  onClose,
  stay,
  partyStays = [],
  onSelectPartyStay,
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
  onCheckoutParty,
  onEditStay,
  onReissueAccess,
  onExtendStay,
  tenantSettings,
  operationalDate,
  bedStatus,
  onMarkBedReady,
  initialTab = 'stay',
  initialPartyView = false,
  initialFocusStayId = null,
  editSurface = null,
  editDismissBlocked = false,
}: ReceptionGuestStayDetailProps) {
  const isBelowLg = useIsReceptionStayDetailBelowLg();
  const [activeTab, setActiveTab] = useState<StayDetailTabId>(initialTab);
  const [partyLevelOpen, setPartyLevelOpen] = useState(initialPartyView);
  const [enteredChildFromParty, setEnteredChildFromParty] = useState(false);
  const [partyStackSlideFrom, setPartyStackSlideFrom] =
    useState<PartyStackSlideFrom>('right');
  const [partyStackMotionEnabled, setPartyStackMotionEnabled] = useState(false);
  const [partySheetTab, setPartySheetTab] = useState<PartySheetTabId>('booking');
  const [focusStayId, setFocusStayId] = useState<string | null>(initialFocusStayId);
  const [deskQrFocusKey, setDeskQrFocusKey] = useState(0);
  const [tourismStatus, setTourismStatus] = useState<TourismStatusBadge | null>(null);
  const [partyTourismByStayId, setPartyTourismByStayId] = useState<
    Record<string, TourismStatusBadge>
  >({});
  const [tourismAccessReady, setTourismAccessReady] = useState(false);
  const [canAddTourismGuest, setCanAddTourismGuest] = useState(false);
  const [skipTourismConfirmOpen, setSkipTourismConfirmOpen] = useState(false);
  const [skipTourismConfirmMode, setSkipTourismConfirmMode] = useState<'single' | 'party'>(
    'single'
  );
  const [bedReadyConfirmOpen, setBedReadyConfirmOpen] = useState(false);
  const [bedReadyConfirmPending, setBedReadyConfirmPending] = useState<'checkIn' | 'unlock' | null>(
    null
  );
  const [bedReadyConfirmError, setBedReadyConfirmError] = useState<string | null>(null);
  const [bedReadyConfirmPendingBusy, startBedReadyConfirm] = useTransition();
  const [partyCheckInError, setPartyCheckInError] = useState<string | null>(null);
  const [partyCheckInPending, startPartyCheckIn] = useTransition();
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
      const next = Boolean(controls?.canAddGuest);
      setCanAddTourismGuest((prev) => (prev === next ? prev : next));
    },
    []
  );

  // Must be stable: StayTourismRegistrationBlock syncs via useEffect([status, onTourismStatusChange]).
  // Inline + always-new partyTourism map → Maximum update depth on Tourism tab only.
  const handleTourismStatusChange = useCallback(
    (status: TourismStatusBadge) => {
      setTourismStatus(status);
      setPartyTourismByStayId((current) =>
        current[stay.id] === status ? current : { ...current, [stay.id]: status }
      );
    },
    [stay.id]
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
  const bedReady = isBedReadyForGuestVisibility(bedStatus);
  const tourismBlocksCheckIn = tourismIncomplete && !canSkipTourismGate;
  // Allow click when bed is not ready so staff can mark ready in-place; tourism hard-block only after ready.
  const checkInDisabled = tourismBlocksCheckIn && bedReady;
  const checkInHint = !bedReady
    ? 'Bed is not marked ready — confirm readiness before check-in.'
    : tourismBlocksCheckIn
      ? 'Complete tourism registration and upload passport photos before check-in.'
      : null;

  const proceedCheckIn = () => {
    if (tourismIncomplete) {
      if (!canSkipTourismGate) return;
      setSkipTourismConfirmMode('single');
      setSkipTourismConfirmOpen(true);
      return;
    }
    access.checkIn();
  };

  const requestCheckIn = () => {
    if (!bedReady) {
      if (!onMarkBedReady) return;
      setBedReadyConfirmError(null);
      setBedReadyConfirmPending('checkIn');
      setBedReadyConfirmOpen(true);
      return;
    }
    proceedCheckIn();
  };

  const requestUnlockBed = () => {
    if (!bedReady) {
      if (!onMarkBedReady) return;
      setBedReadyConfirmError(null);
      setBedReadyConfirmPending('unlock');
      setBedReadyConfirmOpen(true);
      return;
    }
    access.unlockBed();
  };

  const confirmMarkBedReady = () => {
    if (!onMarkBedReady) return;
    const pending = bedReadyConfirmPending;
    startBedReadyConfirm(async () => {
      setBedReadyConfirmError(null);
      const ok = await onMarkBedReady(stay.bed_id);
      if (!ok) {
        setBedReadyConfirmError('Could not mark ready. Try again.');
        return;
      }
      setBedReadyConfirmOpen(false);
      setBedReadyConfirmPending(null);
      // Defer so confirm click does not fall through to the sheet.
      window.setTimeout(() => {
        if (pending === 'unlock') {
          access.unlockBed();
          return;
        }
        if (pending === 'checkIn') {
          proceedCheckIn();
        }
      }, 0);
    });
  };

  const runCheckInParty = (bypassAccessGate: boolean) => {
    if (!tenantSlug) return;
    const stayIds = (partyStays.length > 0 ? partyStays : [stay]).map((member) => member.id);
    startPartyCheckIn(async () => {
      setPartyCheckInError(null);
      const result = await checkInPartyAction({
        tenantSlug,
        stayIds,
        bypassAccessGate,
      });
      if (!result.ok) {
        if (
          (result.error === 'tourism_incomplete' || result.error === 'missing_documents') &&
          canSkipTourismGate &&
          !bypassAccessGate
        ) {
          setSkipTourismConfirmMode('party');
          setSkipTourismConfirmOpen(true);
          return;
        }
        setPartyCheckInError(
          result.error === 'unauthorized'
            ? 'Sign in again at reception desk.'
            : result.error === 'forbidden'
              ? 'You do not have permission to skip the tourism gate.'
              : result.error === 'tourism_incomplete' || result.error === 'missing_documents'
                ? 'Complete tourism registration and upload passport photos for all pending guests.'
                : result.error === 'bed_not_ready'
                  ? 'Mark every pending bed as ready in Cleaning before check-in.'
                  : 'Could not check in all guests.'
        );
        return;
      }
      onPassportCheckedAtChange?.(stay);
    });
  };

  const requestCheckInParty = () => {
    runCheckInParty(false);
  };

  const confirmSkipTourismCheckIn = () => {
    // Check in first; defer dialog close so the confirm click does not fall through to the sheet.
    if (skipTourismConfirmMode === 'party') {
      runCheckInParty(true);
    } else {
      access.checkIn({ bypassAccessGate: true });
    }
    window.setTimeout(() => setSkipTourismConfirmOpen(false), 0);
  };

  const partySessionKey = stay.booking_group_id?.trim() || stay.id;

  useEffect(() => {
    setPartyLevelOpen(initialPartyView);
    setEnteredChildFromParty(false);
    setPartyStackSlideFrom('right');
    setPartyStackMotionEnabled(false);
    setPartySheetTab('booking');
    setFocusStayId(initialFocusStayId);
    setTourismStatus(showTourismTab ? 'not_started' : null);
    setPartyTourismByStayId({});
    setTourismAccessReady(false);
    setSkipTourismConfirmOpen(false);
    setSkipTourismConfirmMode('single');
    setBedReadyConfirmOpen(false);
    setBedReadyConfirmPending(null);
    setBedReadyConfirmError(null);
    setPartyCheckInError(null);
    if (!showTourismTab) {
      setCanAddTourismGuest(false);
      tourismAddGuestRef.current = null;
    }
  }, [partySessionKey, showTourismTab, initialPartyView, initialFocusStayId]);

  // Per-stay surface within the same sheet (party → child push included).
  useEffect(() => {
    setActiveTab(initialTab);
    setDeskQrFocusKey(0);
  }, [stay.id, initialTab]);

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
        const status = resolveTourismStatusBadge(result.registration);
        setTourismStatus(status);
        setTourismAccessReady(isTourismReadyForAccess(result.registration));
        setPartyTourismByStayId((current) => ({ ...current, [stay.id]: status }));
        return;
      }
      setTourismStatus('not_started');
      setTourismAccessReady(false);
      setPartyTourismByStayId((current) => ({ ...current, [stay.id]: 'not_started' }));
    });

    return () => {
      cancelled = true;
    };
  }, [stay.id, tenantSlug, showTourismTab]);

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
  const bedUnlockedAt = access.bedUnlockedAt ?? stay.bed_unlocked_at;
  const showUnlockBed =
    Boolean(tenantSlug) &&
    resolveShowUnlockBedAction({
      stay: {
        ...stay,
        bed_unlocked_at: bedUnlockedAt,
      },
      stayEnded,
      propertyTimeZone: tenantSettings?.propertyTimeZone,
      checkInTimeFallback: tenantSettings?.checkInTime,
    });
  const accessTabTone = resolveAccessTabBadge({
    hasMagicLink: Boolean(stay.magicLinkUrl),
    hasPinInSession: Boolean(stayPins[stay.id]),
  });
  const tourismTabTone = resolveTourismTabBadge(
    showTourismTab ? (tourismStatus ?? 'not_started') : null
  );

  const resolvedPartyStays =
    partyStays.length > 0
      ? partyStays
      : stay.booking_group_id
        ? [stay]
        : [];
  const balanceStay =
    resolvedPartyStays.find(
      (member) => member.booking_amount_due_minor != null && member.booking_amount_currency
    ) ?? stay;
  const contactStay = resolvePartyContactStay(resolvedPartyStays) ?? stay;
  const isParty = resolvedPartyStays.length > 1 && Boolean(onSelectPartyStay);
  const partyLeadName = isParty ? resolvePartyLeadName(resolvedPartyStays) : '';
  const partyTitle = isParty
    ? resolvePartyTitle(partyLeadName || guestLabel, resolvedPartyStays.length)
    : guestLabel;
  const partyMemberTitle = isParty
    ? resolvePartyMemberTitle({
        guestName: stay.guest_name,
        leadName: partyLeadName || guestLabel,
        ordinal: resolvePartyMemberOrdinal(resolvedPartyStays, stay.id),
      })
    : guestLabel;
  const pendingPartyCheckIns = resolvedPartyStays.filter(
    (member) => !isStayAdmitted(member) && !isReceptionStayPastCheckOut(member, operationalDate)
  );
  const eligiblePartyCheckouts = filterEligiblePartyCheckoutStays(
    resolvedPartyStays,
    operationalDate
  );
  const showCheckInParty =
    Boolean(tenantSlug) && isParty && !stayEnded && pendingPartyCheckIns.length > 0;
  const showCheckoutParty =
    Boolean(tenantSlug) && isParty && eligiblePartyCheckouts.length > 0;
  const partyCheckoutOverdue = partyCheckoutAllOverdue(resolvedPartyStays, operationalDate);
  const partyCheckInDisabled = isPending || partyCheckInPending;
  const requestCheckoutParty = () => {
    onCheckoutParty(eligiblePartyCheckouts.map((member) => member.id));
  };
  const showDesktopPartyPeek = !isBelowLg && isParty;
  /** Mobile only: party root replaces child body. */
  const showPartyRoot = isBelowLg && isParty && partyLevelOpen;
  const showEdit = Boolean(editSurface);
  /** Child of a party: Back → Group on mobile only (desktop has peek). */
  const showBackToParty = !showEdit && !showPartyRoot && isParty && isBelowLg;
  const isPartyChild = isParty && !showPartyRoot && !showEdit;
  const partyBackLabel = 'Group';
  const editBackLabel =
    isParty && partyLevelOpen ? 'Group' : bedLabel.trim() || guestLabel || 'Back';
  const stackLevelKey = showEdit ? 'edit' : showPartyRoot ? 'party' : `child-${stay.id}`;
  const partyStayIdsKey = resolvedPartyStays
    .map((member) => member.id)
    .sort()
    .join(',');

  const wasEditOpenRef = useRef(false);
  useEffect(() => {
    if (showEdit) {
      setPartyStackSlideFrom('right');
      setPartyStackMotionEnabled(true);
      wasEditOpenRef.current = true;
      return;
    }
    if (wasEditOpenRef.current) {
      setPartyStackSlideFrom('left');
      setPartyStackMotionEnabled(true);
      wasEditOpenRef.current = false;
    }
  }, [showEdit]);

  useEffect(() => {
    if (!showTourismTab || !tenantSlug || !isParty || !partyStayIdsKey) {
      return;
    }

    let cancelled = false;
    const stayIds = partyStayIdsKey.split(',').filter(Boolean);

    void Promise.all(
      stayIds.map(async (stayId) => {
        const result = await loadTourismRegistrationForReceptionAction({
          tenantSlug,
          stayId,
        });
        return {
          stayId,
          status: (result.ok
            ? resolveTourismStatusBadge(result.registration)
            : 'not_started') as TourismStatusBadge,
        };
      })
    ).then((rows) => {
      if (cancelled) return;
      setPartyTourismByStayId((current) => {
        const next = { ...current };
        for (const row of rows) {
          next[row.stayId] = row.status;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [showTourismTab, tenantSlug, isParty, partyStayIdsKey]);

  const handleSelectPartyBed = (stayId: string) => {
    setFocusStayId(null);
    setEnteredChildFromParty(true);
    if (isBelowLg) {
      setPartyStackSlideFrom('right');
      setPartyStackMotionEnabled(true);
      setPartyLevelOpen(false);
    }
    onSelectPartyStay?.(stayId);
  };

  const partyContactSlot =
    tenantSlug && isParty ? (
      <StayContactBlock
        stay={contactStay}
        tenantSlug={tenantSlug}
        onStayUpdated={onReceptionNoteChange}
      />
    ) : null;

  const partyNoteSlot =
    tenantSlug && isParty ? (
      <StayReceptionNoteBlock
        stay={balanceStay}
        tenantSlug={tenantSlug}
        onStayUpdated={onReceptionNoteChange}
      />
    ) : null;

  const bookingMeta = formatPartySheetMeta(checkInDay, checkOutDay, bookingSourceLine);

  const header = showPartyRoot ? (
    <p className="truncate text-xs text-muted-foreground">{bookingMeta}</p>
  ) : isPartyChild ? (
    <div className="space-y-0.5">
      <p className="truncate text-xs text-muted-foreground">
        {bedLabel}
        {stayRef ? (
          <span className="font-mono">
            {' '}
            · #{stayRef}
          </span>
        ) : null}
      </p>
      {access.accessGranted && stay.desk_checked_in_at ? (
        <p className="text-xs font-medium text-emerald-800">
          Checked in · {formatReceptionDateTime(stay.desk_checked_in_at)}
        </p>
      ) : null}
      {bedUnlockedAt && !access.accessGranted ? (
        <p className="text-xs font-medium text-emerald-800">
          Bed unlocked · {formatReceptionDateTime(bedUnlockedAt)}
        </p>
      ) : null}
    </div>
  ) : (
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
      <p className="truncate text-xs text-muted-foreground">{bookingMeta}</p>
      {access.accessGranted && stay.desk_checked_in_at ? (
        <p className="text-xs font-medium text-emerald-800">
          Checked in · {formatReceptionDateTime(stay.desk_checked_in_at)}
        </p>
      ) : null}
      {bedUnlockedAt && !access.accessGranted ? (
        <p className="text-xs font-medium text-emerald-800">
          Bed unlocked · {formatReceptionDateTime(bedUnlockedAt)}
        </p>
      ) : null}
    </header>
  );

  const footerActions =
    showPartyRoot
      ? partySheetTab === 'booking' && (showCheckInParty || showCheckoutParty)
        ? (
            <div className="space-y-1.5">
              {partyCheckInError ? (
                <p className="text-xs text-destructive">{partyCheckInError}</p>
              ) : null}
              {showCheckInParty ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={partyCheckInDisabled}
                  onClick={requestCheckInParty}
                >
                  {partyCheckInPending ? 'Checking in…' : 'Check in all'}
                </Button>
              ) : null}
              {showCheckoutParty ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={isPending}
                  onClick={requestCheckoutParty}
                >
                  {partyCheckoutOverdue ? 'Confirm checkout all' : 'Check out all'}
                </Button>
              ) : null}
            </div>
          )
        : null
      : (
        <ReceptionGuestStayDetailActions
          stay={stay}
          isPending={isPending || access.isPending}
          onCancelOrCheckout={onCancelOrCheckout}
          operationalDate={operationalDate}
          showAddTourismGuest={activeTab === 'tourism' && showTourismTab && !stayEnded}
          onAddTourismGuest={() => tourismAddGuestRef.current?.()}
          addTourismGuestDisabled={!canAddTourismGuest}
          showCheckIn={Boolean(tenantSlug) && !access.accessGranted && !stayEnded}
          onCheckIn={requestCheckIn}
          checkInDisabled={checkInDisabled}
          checkInHint={checkInHint}
          checkInError={access.actionError}
          checkInVariant={
            !isBelowLg && isParty && showCheckInParty ? 'outline' : 'default'
          }
        />
      );

  const focusPartyMember =
    focusStayId != null
      ? resolvedPartyStays.find((member) => member.id === focusStayId) ?? null
      : null;
  const showPartyFocusCta = Boolean(showPartyRoot && focusPartyMember);
  const partyFocusCtaLabel = focusPartyMember
    ? `Open ${resolveBedLabel(focusPartyMember.bed_id).trim() || focusPartyMember.guest_name?.trim() || 'bed'}`
    : null;

  const footer =
    showPartyFocusCta || footerActions ? (
      <div className="space-y-2">
        {showPartyFocusCta && focusStayId && partyFocusCtaLabel ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => handleSelectPartyBed(focusStayId)}
          >
            {partyFocusCtaLabel}
          </Button>
        ) : null}
        {footerActions}
      </div>
    ) : null;

  const childTabsList = (
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

  const partyRootBody =
    isBelowLg && isParty && onSelectPartyStay ? (
      <StayPartyMobilePanel
        partyStays={resolvedPartyStays}
        activeStayId={stay.id}
        balanceStay={balanceStay}
        resolveBedLabel={resolveBedLabel}
        onSelectStay={handleSelectPartyBed}
        tenantSlug={tenantSlug}
        onStayBookingBalanceChange={onStayBookingBalanceChange}
        contactSlot={partyContactSlot}
        noteSlot={partyNoteSlot}
        bookingSourceSlot={
          <StayBookingSourceOpenBlock stay={balanceStay} tenantSettings={tenantSettings} />
        }
        showTourismSummary={showTourismTab}
        tourismByStayId={partyTourismByStayId}
      />
    ) : null;

  const tabsBody = (
    <>
      <TabsContent value="stay" className="mt-0 space-y-4 outline-none">
        {!isParty ? (
          <StayBookingSourceOpenBlock stay={stay} tenantSettings={tenantSettings} />
        ) : null}
        {tenantSlug ? (
          <>
            {!isParty ? (
              <StayBookingBalanceBlock
                stay={stay}
                balanceStay={balanceStay}
                isPartySibling={false}
                tenantSlug={tenantSlug}
                onStayUpdated={onStayBookingBalanceChange}
              />
            ) : null}
            {!isParty ? (
              <StayContactBlock
                stay={stay}
                tenantSlug={tenantSlug}
                onStayUpdated={onReceptionNoteChange}
              />
            ) : null}
            <StayReceptionNoteBlock
              stay={stay}
              tenantSlug={tenantSlug}
              onStayUpdated={onReceptionNoteChange}
            />
            <StayPassportCheckedBlock
              passportChecked={access.passportChecked}
              passportCheckedAt={access.passportCheckedAt}
              isPending={access.isPending}
              readOnly={stayEnded}
              onToggle={access.setPassportChecked}
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
              onTourismStatusChange={handleTourismStatusChange}
              onTourismAccessReadyChange={setTourismAccessReady}
              onAddGuestControlsChange={handleTourismAddGuestControlsChange}
            />
          ) : null}
        </TabsContent>
      ) : null}

      <TabsContent value="access" className="mt-0 space-y-4 outline-none">
        {!tenantSlug ? (
          <p className="text-xs text-muted-foreground">Access actions unavailable.</p>
        ) : null}

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

  const shell = (
      <ReceptionStayDetailShell
        open={open}
        onClose={() => {
          if (skipTourismConfirmOpen || bedReadyConfirmOpen) return;
          if (editSurface) {
            (editSurface.onDismiss ?? editSurface.onBack)();
            return;
          }
          onClose();
        }}
        dismissBlocked={
          skipTourismConfirmOpen || bedReadyConfirmOpen || editDismissBlocked
        }
        accessibleTitle={
          showEdit && editSurface
            ? editSurface.title
            : showPartyRoot
              ? partyTitle
              : isPartyChild
                ? partyMemberTitle
                : guestLabel
        }
        titleSize={showPartyRoot ? 'party' : 'default'}
        titlePrefix={
          showEdit
            ? undefined
            : showPartyRoot
              ? <BookingGroupIcon className="text-foreground/70" />
              : undefined
        }
        titleTrailing={
          showEdit || showPartyRoot
            ? undefined
            : overdueCheckout
              ? (
                  <Badge variant="warning" aria-label="Checkout overdue">
                    Overdue
                  </Badge>
                )
              : undefined
        }
        titleLeading={
          showEdit && editSurface ? (
            <button
              type="button"
              onClick={editSurface.onBack}
              className="inline-flex h-8 max-w-[min(100%,14rem)] items-center gap-0.5 rounded-md px-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-4 shrink-0" />
              <span className="truncate">{editBackLabel}</span>
            </button>
          ) : showBackToParty ? (
            <button
              type="button"
              onClick={() => {
                setPartyStackSlideFrom('left');
                setPartyStackMotionEnabled(true);
                setPartyLevelOpen(true);
              }}
              className="inline-flex h-8 max-w-[min(100%,14rem)] items-center gap-0.5 rounded-md px-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-4 shrink-0" />
              <span className="truncate">{partyBackLabel}</span>
            </button>
          ) : undefined
        }
        header={showEdit && editSurface ? editSurface.header : header}
        bodyTop={
          showEdit
            ? undefined
            : showPartyRoot
              ? <StayPartySheetTabsList />
              : childTabsList
        }
        body={
          showEdit && editSurface
            ? editSurface.body
            : showPartyRoot
              ? partyRootBody
              : tabsBody
        }
        wrapBodyRegion={(region) => {
          const stacked = (
            <div
              key={stackLevelKey}
              className={cn(
                'flex min-h-0 flex-1 flex-col',
                partyStackMotionEnabled && partyStackMotionClass(partyStackSlideFrom)
              )}
            >
              {region}
            </div>
          );
          // Party / child Tabs must not share one namespace (Radix setState loop).
          if (showEdit) {
            return stacked;
          }
          if (showPartyRoot) {
            return (
              <Tabs
                value={partySheetTab}
                onValueChange={(value) => setPartySheetTab(value as PartySheetTabId)}
                className="contents"
              >
                {stacked}
              </Tabs>
            );
          }
          return (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as StayDetailTabId)}
              className="contents"
            >
              {stacked}
            </Tabs>
          );
        }}
        footer={showEdit ? null : footer}
        sidePanel={
          showEdit
            ? undefined
            : showDesktopPartyPeek
              ? (
            <StayPartyPeek
              partyStays={resolvedPartyStays}
              activeStayId={stay.id}
              balanceStay={balanceStay}
              checkInDate={checkInDay}
              checkOutDate={checkOutDay}
              bookingSourceLine={bookingSourceLine}
              resolveBedLabel={resolveBedLabel}
              onSelectStay={handleSelectPartyBed}
              tenantSlug={tenantSlug}
              onStayBookingBalanceChange={onStayBookingBalanceChange}
              contactSlot={partyContactSlot}
              noteSlot={partyNoteSlot}
              bookingSourceSlot={
                <StayBookingSourceOpenBlock stay={balanceStay} tenantSettings={tenantSettings} />
              }
              showTourismSummary={showTourismTab}
              tourismByStayId={partyTourismByStayId}
              showCheckInParty={showCheckInParty}
              checkInPartyDisabled={partyCheckInDisabled}
              checkInPartyPending={partyCheckInPending}
              checkInPartyError={partyCheckInError}
              onCheckInParty={requestCheckInParty}
              showCheckoutParty={showCheckoutParty}
              checkoutPartyDisabled={isPending}
              checkoutPartyOverdue={partyCheckoutOverdue}
              onCheckoutParty={requestCheckoutParty}
              onEditParty={
                stayEnded
                  ? undefined
                  : () =>
                      onEditStay(balanceStay, {
                        intent: 'changeDates',
                        partyStays: resolvedPartyStays,
                      })
              }
              editPartyDisabled={isPending}
            />
              )
            : undefined
        }
        onEdit={
          showEdit || stayEnded
            ? undefined
            : showPartyRoot
              ? () =>
                  onEditStay(balanceStay, {
                    intent: 'changeDates',
                    partyStays: resolvedPartyStays,
                  })
              : isParty
                ? undefined
                : () => onEditStay(stay, { intent: 'changeDates' })
        }
        editDisabled={isPending}
        headerExtra={
          showEdit
            ? editSurface?.chromeAction
            : showPartyRoot
              ? undefined
              : (
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
                )
        }
        headerOverflow={
          showEdit || showPartyRoot || !tenantSlug ? undefined : (
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
              showUnlockBed={showUnlockBed}
              unlockBedDisabled={bedReadyConfirmPendingBusy}
              unlockBedHint={
                bedReady
                  ? null
                  : 'Bed is not marked ready — confirm readiness before unlocking.'
              }
              onUnlockBed={requestUnlockBed}
              showMoveBed={isParty && !stayEnded}
              onMoveBed={() => onEditStay(stay, { intent: 'moveBed' })}
            />
          )
        }
      />
  );

  const confirmDialog = (
      <ConfirmDialog
        open={skipTourismConfirmOpen}
        title="Tourism registration incomplete"
        description={
          skipTourismConfirmMode === 'party'
            ? 'One or more guests have incomplete tourism registration / passport photos. Check in all of them anyway?'
            : 'Guest tourism registration / passport photos are incomplete. Check in anyway?'
        }
        cancelLabel="Cancel"
        confirmLabel="Continue anyway"
        confirmVariant="destructive"
        onCancel={() => setSkipTourismConfirmOpen(false)}
        onConfirm={confirmSkipTourismCheckIn}
      />
  );

  const bedReadyConfirmDialog = (
    <ConfirmDialog
      open={bedReadyConfirmOpen}
      description={
        bedReadyConfirmError
          ? bedReadyConfirmError
          : bedReadyConfirmPending === 'unlock'
            ? 'Bed not ready. Mark ready and unlock?'
            : 'Bed not ready. Mark ready and check in?'
      }
      cancelLabel="Cancel"
      confirmLabel={bedReadyConfirmPendingBusy ? 'Marking…' : 'Mark ready'}
      confirmVariant="default"
      onCancel={() => {
        if (bedReadyConfirmPendingBusy) return;
        setBedReadyConfirmOpen(false);
        setBedReadyConfirmPending(null);
        setBedReadyConfirmError(null);
      }}
      onConfirm={() => {
        if (bedReadyConfirmPendingBusy) return;
        confirmMarkBedReady();
      }}
    />
  );

  // Sheet/dialog root stays mounted across party ↔ child; Tabs live in wrapBodyRegion.
  return (
    <>
      {shell}
      {confirmDialog}
      {bedReadyConfirmDialog}
    </>
  );
}
