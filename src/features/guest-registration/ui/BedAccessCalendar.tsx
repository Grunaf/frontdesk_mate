'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckInDate, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';
import {
  HOUSEKEEPING_BED_STATUS_LABELS,
  HOUSEKEEPING_BED_STATUSES,
  HOUSEKEEPING_ROOM_STATUSES,
  isHousekeepingBedNeedsWork,
  type HousekeepingBedStatus,
  type HousekeepingRoomStatus,
} from '@/entities/housekeeping';
import type { TenantSettings } from '@/entities/tenant';
import {
  formatCalendarRangeLabel,
  resolveBedDayCalendar,
  shiftCalendarAnchor,
  type BedDayCalendarView,
} from '../lib/resolveBedDayCalendar';
import {
  filterPlanRoomGroupsByFreeTonight,
  type PlanBedFilter,
} from '../lib/filterPlanRoomGroupsByFreeTonight';
import { filterPlanRoomGroupsForMoveBed } from '../lib/filterPlanRoomGroupsForMoveBed';
import {
  DEFAULT_PLAN_QUICK_FILTERS,
  filterPlanRoomGroupsByQuickFilters,
  isPlanQuickFiltersActive,
  sanitizePlanQuickFilters,
  type PlanQuickFiltersState,
} from '../lib/filterPlanRoomGroupsByQuickFilters';
import { readPlanQuickFilters, writePlanQuickFilters } from '../lib/planQuickFiltersStorage';
import { todayUtcDate } from '../lib/guestAccessDates';
import {
  planStayLifecycleStatusLabel,
  resolvePlanStayLifecycleStatus,
  type PlanStayLifecycleStatus,
} from '../lib/resolvePlanStayLifecycleStatus';
import {
  isPlanStayAdmitted,
  isPlanStayCellInactive,
  isPlanStayUnpaid,
} from '../lib/resolvePlanStayCalendarPresentation';
import {
  resolvePlanStayGuestLabel,
} from '../lib/resolvePartyTitle';
import type {
  PlanStayQuickAction,
  PlanStayQuickActionId,
} from '../lib/resolvePlanStayQuickActions';
import { RECEPTION_PLAN_TOOLBAR_SLOT_ID } from '../lib/receptionStickyChrome';
import { PlanQuickFiltersBar } from './PlanQuickFiltersBar';
import {
  PlanStayQuickActionsContextMenu,
  PlanStayQuickActionsSheet,
} from './PlanStayQuickActionsSheet';
import { Check } from 'lucide-react';
import { Button, Icon, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { getCurrencyDefinition, isCurrencyCode } from '@/shared/lib/currency';
import { resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';

/** Vertical bed move on Plan: pick stay → pick free bed (same nights). */
export type PlanCalendarMoveMode =
  | { phase: 'pickStay' }
  | { phase: 'pickBed'; stayId: string };

const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_PX = 10;

type StayQuickMenuState =
  | {
      stayId: string;
      surface: 'sheet';
    }
  | {
      stayId: string;
      surface: 'context';
      x: number;
      y: number;
    };

interface BedAccessCalendarProps {
  settings: TenantSettings;
  stays: GuestStayRecordWithLink[];
  onViewStay: (stayId: string) => void;
  onSelectFreeNight: (bedId: string, nightDate: string) => void;
  /** Rare whole-room hold: click blocked cell → parent confirm → create. */
  onSelectBlockedNight?: (bedId: string, nightDate: string) => void;
  embedded?: boolean;
  /** Used for plan quick-filter localStorage key. */
  tenantSlug?: string;
  bedStatuses?: Record<string, HousekeepingBedStatus>;
  roomStatuses?: Record<string, HousekeepingRoomStatus>;
  onSetBedStatus?: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetRoomStatus?: (roomId: string, status: HousekeepingRoomStatus) => void;
  housekeepingBusy?: boolean;
  /** When true, show arrival/in/leaving/late chips on today's occupied cells. */
  planStayStatusEnabled?: boolean;
  /** Operational / Plan “today” column (YYYY-MM-DD). Defaults to UTC calendar today. */
  planToday?: string;
  bedFilter?: PlanBedFilter;
  onBedFilterChange?: (filter: PlanBedFilter) => void;
  /** Increment to snap the calendar anchor to plan today (e.g. Desk → Free). */
  focusToken?: number;
  /** Vertical Move bed mode owned by the parent. */
  moveMode?: PlanCalendarMoveMode | null;
  /** Bed ids free for the moving stay’s full night range. */
  moveTargetBedIds?: ReadonlySet<string>;
  moveGuestLabel?: string | null;
  moveBusy?: boolean;
  onStartMoveMode?: () => void;
  onCancelMoveMode?: () => void;
  onPickStayForMove?: (stayId: string) => void;
  /** Confirm vertical move to this bed (after in-grid target selection). */
  onPickBedForMove?: (bedId: string) => void;
  /** When false, hide Move bed entry (e.g. no check-in permission). */
  canMoveBeds?: boolean;
  /** Plan long-press / right-click actions. */
  getStayQuickActions?: (stayId: string) => PlanStayQuickAction[];
  onStayQuickAction?: (stayId: string, actionId: PlanStayQuickActionId) => void;
  quickActionsBusy?: boolean;
}

const VIEW_ITEMS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
] as const;

const ROOM_STATUS_LABELS: Record<HousekeepingRoomStatus, string> = {
  cleaned: 'Cleaned',
  not_cleaned: 'Not cleaned',
};

function lifecycleChipClass(status: Extract<PlanStayLifecycleStatus, 'late' | 'leaving'>): string {
  switch (status) {
    case 'late':
      return 'border-destructive/40 bg-destructive/15 text-destructive';
    case 'leaving':
      return 'border-border bg-muted text-foreground';
  }
}

/** Today-only nuance chips; Arriving/In are shown via hollow vs solid cell fill. */
function planLifecycleChipStatus(
  status: PlanStayLifecycleStatus | null
): Extract<PlanStayLifecycleStatus, 'late' | 'leaving'> | null {
  if (status === 'late' || status === 'leaving') return status;
  return null;
}

function occupiedCellSurfaceClass(input: {
  inactive: boolean;
  isTodayColumn: boolean;
  admitted: boolean;
  scheduled: boolean;
}): string {
  if (input.inactive) {
    return 'bg-muted/40 text-muted-foreground hover:bg-muted/50';
  }
  if (input.isTodayColumn) {
    if (!input.admitted) {
      return 'border border-dashed border-primary/45 bg-transparent text-foreground hover:bg-muted/20';
    }
    return input.scheduled
      ? 'border border-transparent bg-amber-50 hover:bg-muted/40'
      : 'border border-transparent bg-primary/15 hover:bg-muted/40';
  }
  return input.scheduled
    ? 'bg-amber-50 hover:bg-muted/40'
    : 'bg-primary/10 hover:bg-muted/40';
}

function planUnpaidCurrencySymbol(
  stay: GuestStayRecordWithLink,
  settings: TenantSettings
): string {
  const stayCurrency = stay.booking_amount_currency;
  if (stayCurrency && isCurrencyCode(stayCurrency)) {
    return getCurrencyDefinition(stayCurrency).symbol;
  }
  return getCurrencyDefinition(resolveTenantCurrency(settings).primary).symbol;
}

function formatDayHeader(nightDate: string, isToday: boolean): string {
  const date = new Date(`${nightDate}T00:00:00.000Z`);
  const label = date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
  return isToday ? `${label} · Today` : label;
}

function useIsMobileCalendar(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function nextRoomStatus(current: HousekeepingRoomStatus | undefined): HousekeepingRoomStatus {
  if (!current) return HOUSEKEEPING_ROOM_STATUSES[0];
  const index = HOUSEKEEPING_ROOM_STATUSES.indexOf(current);
  return HOUSEKEEPING_ROOM_STATUSES[(index + 1) % HOUSEKEEPING_ROOM_STATUSES.length];
}

function isSyntheticRoomId(roomId: string): boolean {
  return roomId.startsWith('__');
}

function roomStatusNeedsWork(status: HousekeepingRoomStatus): boolean {
  return status === 'not_cleaned';
}

function HousekeepingBedStatusSelect({
  status,
  disabled,
  locked,
  onChange,
  className,
}: {
  status: HousekeepingBedStatus | undefined;
  disabled?: boolean;
  /** Ready is locked on Plan — change via Cleaning if needed. */
  locked?: boolean;
  onChange: (status: HousekeepingBedStatus) => void;
  className?: string;
}) {
  const needsWork = isHousekeepingBedNeedsWork(status);
  const unset = !status;

  return (
    <select
      aria-label="Bed cleaning status"
      disabled={disabled || locked}
      value={status ?? ''}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        event.stopPropagation();
        const value = event.target.value;
        if (
          value === 'needs_strip' ||
          value === 'stripped' ||
          value === 'ready'
        ) {
          onChange(value);
        }
      }}
      className={cn(
        'max-w-[6.75rem] shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight',
        unset && 'border-border bg-background text-muted-foreground',
        !unset && needsWork && 'border-amber-200 bg-amber-50 text-amber-900',
        !unset && !needsWork && 'border-transparent bg-muted text-muted-foreground',
        (disabled || locked) && 'pointer-events-none opacity-60',
        className
      )}
    >
      <option value="" disabled={Boolean(status)}>
        Unset
      </option>
      {HOUSEKEEPING_BED_STATUSES.map((choice) => (
        <option key={choice} value={choice}>
          {HOUSEKEEPING_BED_STATUS_LABELS[choice]}
        </option>
      ))}
    </select>
  );
}

function HousekeepingChip({
  label,
  needsWork,
  unset,
  disabled,
  onClick,
}: {
  label: string;
  needsWork: boolean;
  unset: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'max-w-[6.75rem] shrink-0 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-colors',
        unset && 'border-border bg-background text-muted-foreground hover:bg-muted/40',
        !unset && needsWork && 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
        !unset && !needsWork && 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      {label}
    </button>
  );
}

export function BedAccessCalendar({
  settings,
  stays,
  onViewStay,
  onSelectFreeNight,
  onSelectBlockedNight,
  embedded = false,
  tenantSlug,
  bedStatuses,
  roomStatuses,
  onSetBedStatus,
  onSetRoomStatus,
  housekeepingBusy = false,
  planStayStatusEnabled = false,
  planToday,
  bedFilter = 'all',
  onBedFilterChange,
  focusToken,
  moveMode = null,
  moveTargetBedIds,
  moveBusy = false,
  onStartMoveMode,
  onCancelMoveMode,
  onPickStayForMove,
  onPickBedForMove,
  canMoveBeds = false,
  getStayQuickActions,
  onStayQuickAction,
  quickActionsBusy = false,
}: BedAccessCalendarProps) {
  const isMobile = useIsMobileCalendar();
  const [view, setView] = useState<BedDayCalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(() => planToday ?? todayUtcDate());
  const [internalBedFilter, setInternalBedFilter] = useState<PlanBedFilter>('all');
  const [quickFilters, setQuickFilters] = useState<PlanQuickFiltersState>(DEFAULT_PLAN_QUICK_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toolbarSlotEl, setToolbarSlotEl] = useState<HTMLElement | null>(null);
  const quickFiltersSlugRef = useRef<string | null>(null);
  const [quickMenu, setQuickMenu] = useState<StayQuickMenuState | null>(null);
  const [pendingMoveTargetBedId, setPendingMoveTargetBedId] = useState<string | null>(null);
  const suppressStayClickRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number; stayId: string } | null>(null);

  const effectiveView = isMobile && view === 'month' ? 'week' : view;
  const housekeepingEnabled = Boolean(onSetBedStatus || onSetRoomStatus);
  const lifecycleToday = planToday ?? todayUtcDate();
  const effectiveBedFilter = onBedFilterChange ? bedFilter : internalBedFilter;
  const moveActive = moveMode !== null;
  const movingStayId = moveMode?.phase === 'pickBed' ? moveMode.stayId : null;
  const movingStay = useMemo(
    () => (movingStayId ? stays.find((stay) => stay.id === movingStayId) ?? null : null),
    [movingStayId, stays]
  );
  const quickActionsEnabled = Boolean(getStayQuickActions && onStayQuickAction) && !moveActive;

  const clearLongPress = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressOriginRef.current = null;
  };

  const openQuickMenu = (stayId: string, surface: StayQuickMenuState['surface'], point?: { x: number; y: number }) => {
    if (!quickActionsEnabled) return;
    suppressStayClickRef.current = true;
    if (surface === 'context' && point) {
      setQuickMenu({ stayId, surface: 'context', x: point.x, y: point.y });
      return;
    }
    setQuickMenu({ stayId, surface: 'sheet' });
  };

  const snapAnchorToPlanToday = () => {
    setAnchorDate(lifecycleToday);
  };

  useEffect(() => {
    if (!focusToken) return;
    setAnchorDate(lifecycleToday);
  }, [focusToken, lifecycleToday]);

  useEffect(() => {
    if (!moveActive || !onCancelMoveMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || moveBusy) return;
      if (pendingMoveTargetBedId) {
        setPendingMoveTargetBedId(null);
        return;
      }
      onCancelMoveMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveActive, moveBusy, onCancelMoveMode, pendingMoveTargetBedId]);

  useEffect(() => {
    if (moveActive) setQuickMenu(null);
  }, [moveActive]);

  useEffect(() => {
    if (moveMode?.phase !== 'pickBed') {
      setPendingMoveTargetBedId(null);
    }
  }, [moveMode]);

  useEffect(() => () => clearLongPress(), []);

  useLayoutEffect(() => {
    if (!embedded) {
      setToolbarSlotEl(null);
      return;
    }
    setToolbarSlotEl(document.getElementById(RECEPTION_PLAN_TOOLBAR_SLOT_ID));
  }, [embedded]);

  useEffect(() => {
    const slug = tenantSlug?.trim() ?? '';
    if (!slug) {
      quickFiltersSlugRef.current = null;
      setQuickFilters(DEFAULT_PLAN_QUICK_FILTERS);
      return;
    }

    if (quickFiltersSlugRef.current !== slug) {
      quickFiltersSlugRef.current = slug;
      setQuickFilters(sanitizePlanQuickFilters(readPlanQuickFilters(slug), settings));
      return;
    }

    setQuickFilters((current) => sanitizePlanQuickFilters(current, settings));
  }, [settings, tenantSlug]);

  const handleQuickFiltersChange = (next: PlanQuickFiltersState) => {
    const sanitized = sanitizePlanQuickFilters(next, settings);
    setQuickFilters(sanitized);
    const slug = tenantSlug?.trim() ?? '';
    if (slug) {
      writePlanQuickFilters(slug, sanitized);
    }
  };

  const snapshot = useMemo(
    () => resolveBedDayCalendar(settings, stays, effectiveView, anchorDate),
    [anchorDate, effectiveView, settings, stays]
  );

  const guestLabelByStayId = useMemo(() => {
    const map = new Map<string, string>();
    for (const stay of stays) {
      map.set(stay.id, resolvePlanStayGuestLabel(stay, stays));
    }
    return map;
  }, [stays]);

  const bedLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of snapshot.roomGroups) {
      for (const row of group.rows) {
        map.set(row.bedId, row.displayLabel);
      }
    }
    return map;
  }, [snapshot.roomGroups]);

  const quickMenuStay = useMemo(() => {
    if (!quickMenu) return null;
    return stays.find((stay) => stay.id === quickMenu.stayId) ?? null;
  }, [quickMenu, stays]);

  const quickMenuActions = useMemo(() => {
    if (!quickMenu || !getStayQuickActions) return null;
    return getStayQuickActions(quickMenu.stayId);
  }, [getStayQuickActions, quickMenu]);

  const quickMenuTitle = quickMenuStay
    ? guestLabelByStayId.get(quickMenuStay.id) ??
      resolvePlanStayGuestLabel(quickMenuStay, stays)
    : '';
  const quickMenuMeta = quickMenuStay
    ? `${bedLabelById.get(quickMenuStay.bed_id) ?? quickMenuStay.bed_id} · ${stayRecordCheckInDate(quickMenuStay)} → ${stayRecordCheckOutDate(quickMenuStay)}`
    : '';

  const quickFilteredRoomGroups = useMemo(
    () => filterPlanRoomGroupsByQuickFilters(snapshot.roomGroups, settings, quickFilters),
    [quickFilters, settings, snapshot.roomGroups]
  );

  const visibleRoomGroups = useMemo(() => {
    const filtered =
      effectiveBedFilter === 'free_tonight'
        ? filterPlanRoomGroupsByFreeTonight(quickFilteredRoomGroups, lifecycleToday)
        : quickFilteredRoomGroups;

    if (moveMode?.phase !== 'pickBed' || !movingStay) return filtered;

    return filterPlanRoomGroupsForMoveBed(filtered, {
      currentBedId: movingStay.bed_id,
      targetBedIds: moveTargetBedIds ?? new Set(),
    });
  }, [
    effectiveBedFilter,
    lifecycleToday,
    moveMode?.phase,
    moveTargetBedIds,
    movingStay,
    quickFilteredRoomGroups,
  ]);

  const planBedIds = useMemo(
    () => snapshot.roomGroups.flatMap((group) => group.rows.map((row) => row.bedId)),
    [snapshot.roomGroups]
  );

  const showHousekeepingBanner =
    housekeepingEnabled &&
    planBedIds.length > 0 &&
    planBedIds.some((bedId) => !bedStatuses?.[bedId]);

  const handleBedFilterChange = (next: PlanBedFilter) => {
    if (onBedFilterChange) {
      onBedFilterChange(next);
    } else {
      setInternalBedFilter(next);
    }
    if (next === 'free_tonight') {
      snapAnchorToPlanToday();
    }
  };

  const freeBedsFilterOn = effectiveBedFilter === 'free_tonight';
  const toggleFreeBedsFilter = () => {
    handleBedFilterChange(freeBedsFilterOn ? 'all' : 'free_tonight');
  };
  const anyFiltersActive = freeBedsFilterOn || isPlanQuickFiltersActive(quickFilters);

  if (snapshot.roomGroups.length === 0) {
    return <p className="text-xs text-muted-foreground">No beds to show on the calendar.</p>;
  }

  const rangeLabel = formatCalendarRangeLabel(snapshot.rangeStart, snapshot.rangeEnd);
  const viewItems = isMobile ? VIEW_ITEMS.filter((item) => item.id === 'week') : [...VIEW_ITEMS];
  const quickFiltersHideAll = quickFilteredRoomGroups.length === 0;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedChipBar
        ariaLabel="Calendar view"
        items={viewItems}
        value={effectiveView}
        onValueChange={(id) => {
          setView(id as BedDayCalendarView);
          setAnchorDate(lifecycleToday);
        }}
        className="min-w-0"
      />
      <Button
        type="button"
        size="sm"
        variant={filtersOpen || anyFiltersActive ? 'default' : 'outline'}
        aria-expanded={filtersOpen}
        aria-controls="plan-filters-panel"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        Filters
        {anyFiltersActive && !filtersOpen ? (
          <span
            aria-hidden
            className="ml-1.5 inline-block size-1.5 rounded-full bg-primary-foreground"
          />
        ) : null}
      </Button>
      {canMoveBeds && onStartMoveMode && !moveActive ? (
        <Button type="button" size="sm" variant="outline" onClick={onStartMoveMode}>
          Move bed
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, -1))}
      >
        Prev
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={snapAnchorToPlanToday}>
        Today
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, 1))}
      >
        Next
      </Button>
      <span className="text-xs text-muted-foreground">{rangeLabel}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      {toolbarSlotEl ? createPortal(toolbar, toolbarSlotEl) : toolbar}

      {filtersOpen ? (
        <div id="plan-filters-panel">
          <PlanQuickFiltersBar
            settings={settings}
            filters={quickFilters}
            onFiltersChange={handleQuickFiltersChange}
            totalRoomCount={snapshot.roomGroups.length}
            visibleRoomCount={quickFilteredRoomGroups.length}
            freeBedsFilterOn={freeBedsFilterOn}
            onToggleFreeBeds={toggleFreeBedsFilter}
          />
        </div>
      ) : null}

      {showHousekeepingBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs text-foreground">Set cleaning status for all beds</p>
          <span className="text-[11px] text-muted-foreground">Tap Strip / Make on each bed</span>
        </div>
      ) : null}

      {!embedded && !moveActive ? (
        <p className="text-xs text-muted-foreground">
          Click a guest cell to open their access card. Click a free cell to prefill the issue form.
        </p>
      ) : null}

      {quickFiltersHideAll ? (
        <p className="text-xs text-muted-foreground">No rooms match these filters.</p>
      ) : effectiveBedFilter === 'free_tonight' && visibleRoomGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground">No free beds for this night.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border bg-background px-2 py-1.5 text-left font-medium">
                Bed
              </th>
              {snapshot.days.map((nightDate) => {
                const isTodayColumn = nightDate === lifecycleToday;
                return (
                  <th
                    key={nightDate}
                    className={cn(
                      'min-w-16 border px-1.5 py-1.5 text-left font-medium',
                      isTodayColumn && 'bg-primary/5 font-semibold text-foreground'
                    )}
                  >
                    {formatDayHeader(nightDate, isTodayColumn)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRoomGroups.map((group) => {
              const roomStatus = roomStatuses?.[group.roomId];
              const showRoomChip =
                housekeepingEnabled && onSetRoomStatus && !isSyntheticRoomId(group.roomId);

              return (
                <Fragment key={group.roomId}>
                  <tr className="border-t-2 border-border">
                    <td className="sticky left-0 z-10 border bg-muted px-2 py-1.5">
                      <div className="flex flex-nowrap items-center gap-2">
                        <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
                          {group.roomLabel}
                        </span>
                        {showRoomChip ? (
                          <HousekeepingChip
                            label={roomStatus ? ROOM_STATUS_LABELS[roomStatus] : 'Set…'}
                            needsWork={roomStatus ? roomStatusNeedsWork(roomStatus) : false}
                            unset={!roomStatus}
                            disabled={housekeepingBusy}
                            onClick={() => onSetRoomStatus(group.roomId, nextRoomStatus(roomStatus))}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td
                      colSpan={snapshot.days.length}
                      className="border bg-muted px-2 py-1.5"
                    />
                  </tr>
                  {group.rows.map((row) => {
                    const bedStatus = bedStatuses?.[row.bedId];
                    const showBedChip = housekeepingEnabled && onSetBedStatus;
                    const isPickBedPhase = moveMode?.phase === 'pickBed';
                    const isMoveTargetBed =
                      isPickBedPhase && Boolean(moveTargetBedIds?.has(row.bedId));
                    const isPendingMoveTarget =
                      isPickBedPhase && pendingMoveTargetBedId === row.bedId;

                    return (
                      <tr
                        key={row.bedId}
                        className={cn(isPendingMoveTarget && 'bg-primary/5')}
                      >
                        <td
                          className={cn(
                            'sticky left-0 z-10 border bg-background px-2 py-1.5 pl-4',
                            isPendingMoveTarget && 'z-20'
                          )}
                        >
                          <div className="flex flex-nowrap items-center gap-2">
                            <span className="min-w-0 truncate font-medium text-foreground">
                              {row.displayLabel}
                            </span>
                            {isPendingMoveTarget ? (
                              <button
                                type="button"
                                disabled={moveBusy}
                                onClick={() => onPickBedForMove?.(row.bedId)}
                                aria-label={
                                  moveBusy
                                    ? `Moving to ${row.displayLabel}`
                                    : `Confirm move to ${row.displayLabel}`
                                }
                                className={cn(
                                  'inline-flex h-7 w-[6.75rem] shrink-0 items-center justify-center rounded-md border px-1.5',
                                  'border-primary/30 bg-primary/10 text-primary',
                                  'hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  'disabled:pointer-events-none disabled:opacity-60'
                                )}
                              >
                                {moveBusy ? (
                                  <span className="text-xs font-medium leading-none">…</span>
                                ) : (
                                  <Icon icon={Check} className="size-4 shrink-0" size={16} />
                                )}
                              </button>
                            ) : showBedChip ? (
                              <HousekeepingBedStatusSelect
                                status={bedStatus}
                                disabled={housekeepingBusy || moveActive}
                                locked={bedStatus === 'ready'}
                                onChange={(status) => onSetBedStatus(row.bedId, status)}
                                className={
                                  isPickBedPhase
                                    ? 'box-border h-7 w-[6.75rem] max-w-[6.75rem] py-0 leading-none'
                                    : undefined
                                }
                              />
                            ) : isPickBedPhase ? (
                              <span
                                className="inline-flex h-7 w-[6.75rem] shrink-0"
                                aria-hidden
                              />
                            ) : null}
                          </div>
                        </td>
                        {row.cells.map((cell) => {
                          const inactive = isPlanStayCellInactive({
                            nightDate: cell.nightDate,
                            planToday: lifecycleToday,
                            stay: cell.stay,
                          });
                          const unpaid = cell.stay ? isPlanStayUnpaid(cell.stay) : false;
                          const unpaidSymbol =
                            unpaid && cell.stay
                              ? planUnpaidCurrencySymbol(cell.stay, settings)
                              : null;
                          const admitted = cell.stay ? isPlanStayAdmitted(cell.stay) : false;
                          const lifecycle =
                            planStayStatusEnabled && cell.stay && !inactive
                              ? resolvePlanStayLifecycleStatus({
                                  stay: cell.stay,
                                  today: lifecycleToday,
                                  nightDate: cell.nightDate,
                                })
                              : null;
                          const lifecycleChip = planLifecycleChipStatus(lifecycle);
                          const isTodayColumn = cell.nightDate === lifecycleToday;
                          const isMovingStayCell =
                            Boolean(movingStayId) && cell.stay?.id === movingStayId;
                          const isMoveDropCell =
                            isMoveTargetBed &&
                            cell.status === 'free' &&
                            Boolean(movingStay && guestStayCoversNight(movingStay, cell.nightDate));

                          return (
                            <td
                              key={`${row.bedId}-${cell.nightDate}`}
                              className={cn(
                                'border p-0.5 align-top',
                                isTodayColumn && 'bg-primary/5',
                                isPendingMoveTarget && isMoveDropCell && 'bg-primary/10'
                              )}
                            >
                              {cell.status === 'free' ? (
                                <button
                                  type="button"
                                  disabled={moveBusy || (moveActive && !isMoveDropCell)}
                                  onClick={() => {
                                    if (moveMode?.phase === 'pickBed' && isMoveDropCell) {
                                      setPendingMoveTargetBedId(row.bedId);
                                      return;
                                    }
                                    if (moveActive) return;
                                    onSelectFreeNight(row.bedId, cell.nightDate);
                                  }}
                                  className={cn(
                                    'flex min-h-10 w-full items-center justify-center rounded bg-muted/10 px-1 text-[10px] text-muted-foreground hover:bg-muted/30',
                                    isPendingMoveTarget &&
                                      isMoveDropCell &&
                                      'ring-2 ring-primary ring-offset-1 ring-offset-background',
                                    moveActive && !isMoveDropCell && 'opacity-40'
                                  )}
                                    aria-label={
                                      isMoveDropCell
                                        ? isPendingMoveTarget
                                          ? `Selected ${row.displayLabel} — confirm with checkmark`
                                          : `Select ${row.displayLabel} as move target`
                                        : undefined
                                    }
                                >
                                  ·
                                </button>
                              ) : cell.status === 'blocked' ? (
                                onSelectBlockedNight && !moveActive ? (
                                  <button
                                    type="button"
                                    onClick={() => onSelectBlockedNight(row.bedId, cell.nightDate)}
                                    className={cn(
                                      'flex min-h-10 w-full items-center justify-center rounded px-1 text-[10px]',
                                      inactive
                                        ? 'bg-muted/30 text-muted-foreground/50'
                                        : 'bg-muted/20 text-muted-foreground/70 hover:bg-muted/40 hover:text-muted-foreground'
                                    )}
                                    title="Held by whole-room booking"
                                    aria-label="Held by whole-room booking — tap for options"
                                  >
                                    —
                                  </button>
                                ) : (
                                  <div
                                    className={cn(
                                      'flex min-h-10 w-full items-center justify-center rounded px-1 text-[10px]',
                                      inactive
                                        ? 'bg-muted/30 text-muted-foreground/40'
                                        : 'bg-muted/20 text-muted-foreground/50',
                                      moveActive && 'opacity-40'
                                    )}
                                    title="Held by whole-room booking"
                                    aria-label="Held by whole-room booking"
                                  >
                                    —
                                  </div>
                                )
                              ) : (
                                <button
                                  type="button"
                                  disabled={!cell.stay || moveBusy}
                                  onPointerDown={(event) => {
                                    if (
                                      !quickActionsEnabled ||
                                      !cell.stay ||
                                      !isMobile ||
                                      event.button !== 0
                                    ) {
                                      return;
                                    }
                                    clearLongPress();
                                    longPressOriginRef.current = {
                                      x: event.clientX,
                                      y: event.clientY,
                                      stayId: cell.stay.id,
                                    };
                                    longPressTimerRef.current = window.setTimeout(() => {
                                      const origin = longPressOriginRef.current;
                                      longPressTimerRef.current = null;
                                      if (!origin) return;
                                      openQuickMenu(origin.stayId, 'sheet');
                                    }, LONG_PRESS_MS);
                                  }}
                                  onPointerMove={(event) => {
                                    const origin = longPressOriginRef.current;
                                    if (!origin) return;
                                    const dx = Math.abs(event.clientX - origin.x);
                                    const dy = Math.abs(event.clientY - origin.y);
                                    if (dx > LONG_PRESS_MOVE_PX || dy > LONG_PRESS_MOVE_PX) {
                                      clearLongPress();
                                    }
                                  }}
                                  onPointerUp={clearLongPress}
                                  onPointerCancel={clearLongPress}
                                  onPointerLeave={clearLongPress}
                                  onContextMenu={(event) => {
                                    if (!quickActionsEnabled || !cell.stay || isMobile) return;
                                    event.preventDefault();
                                    openQuickMenu(cell.stay.id, 'context', {
                                      x: event.clientX,
                                      y: event.clientY,
                                    });
                                  }}
                                  onClick={() => {
                                    if (!cell.stay) return;
                                    if (suppressStayClickRef.current) {
                                      suppressStayClickRef.current = false;
                                      return;
                                    }
                                    if (moveMode?.phase === 'pickStay') {
                                      onPickStayForMove?.(cell.stay.id);
                                      return;
                                    }
                                    if (moveMode?.phase === 'pickBed') {
                                      if (cell.stay.id === movingStayId && pendingMoveTargetBedId) {
                                        setPendingMoveTargetBedId(null);
                                      }
                                      return;
                                    }
                                    if (moveActive) return;
                                    onViewStay(cell.stay.id);
                                  }}
                                  className={cn(
                                    'flex min-h-10 w-full flex-col items-start justify-center gap-0.5 rounded px-1 py-0.5 text-left text-[10px]',
                                    occupiedCellSurfaceClass({
                                      inactive,
                                      isTodayColumn,
                                      admitted,
                                      scheduled: cell.status === 'scheduled',
                                    }),
                                    isMovingStayCell &&
                                      'ring-2 ring-primary ring-offset-1 ring-offset-background',
                                    moveMode?.phase === 'pickStay' && 'ring-1 ring-primary/40',
                                    moveMode?.phase === 'pickBed' &&
                                      !isMovingStayCell &&
                                      'opacity-40'
                                  )}
                                >
                                  <span className="flex min-w-0 items-center gap-0.5">
                                    <span
                                      className={cn(
                                        'min-w-0 truncate font-medium',
                                        inactive && 'text-muted-foreground'
                                      )}
                                    >
                                      {cell.stay
                                        ? guestLabelByStayId.get(cell.stay.id) ??
                                          resolvePlanStayGuestLabel(cell.stay, stays)
                                        : cell.status === 'scheduled'
                                          ? 'Soon'
                                          : 'Guest'}
                                    </span>
                                    {unpaidSymbol ? (
                                      <span
                                        className={cn(
                                          'shrink-0 text-[10px] font-semibold leading-none',
                                          inactive ? 'text-muted-foreground' : 'text-destructive'
                                        )}
                                        title="Unpaid"
                                        aria-label="Unpaid"
                                      >
                                        {unpaidSymbol}
                                      </span>
                                    ) : null}
                                  </span>
                                  {lifecycleChip ? (
                                    <span
                                      className={cn(
                                        'rounded border px-1 py-px text-[9px] font-medium leading-tight',
                                        lifecycleChipClass(lifecycleChip)
                                      )}
                                    >
                                      {planStayLifecycleStatusLabel(lifecycleChip)}
                                    </span>
                                  ) : null}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {quickMenuStay && quickMenuActions && quickMenu ? (
        quickMenu.surface === 'sheet' ? (
          <PlanStayQuickActionsSheet
            open
            onOpenChange={(open) => {
              if (!open) setQuickMenu(null);
            }}
            title={quickMenuTitle}
            meta={quickMenuMeta}
            actions={quickMenuActions}
            busy={quickActionsBusy}
            onSelect={(actionId) => {
              onStayQuickAction?.(quickMenu.stayId, actionId);
              setQuickMenu(null);
            }}
          />
        ) : (
          <PlanStayQuickActionsContextMenu
            open
            x={quickMenu.x}
            y={quickMenu.y}
            title={quickMenuTitle}
            meta={quickMenuMeta}
            actions={quickMenuActions}
            busy={quickActionsBusy}
            onClose={() => setQuickMenu(null)}
            onSelect={(actionId) => {
              onStayQuickAction?.(quickMenu.stayId, actionId);
              setQuickMenu(null);
            }}
          />
        )
      ) : null}
    </div>
  );
}
