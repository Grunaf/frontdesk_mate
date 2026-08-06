'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckInDate, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';
import {
  isHousekeepingBedNeedsWork,
  type HousekeepingBedStatus,
} from '@/entities/housekeeping';
import type { TenantSettings } from '@/entities/tenant';
import { resolveReceptionBedLabel } from '@/entities/tenant/lib/resolveBedDisplay';
import {
  formatPlanMonthLabel,
  isPlanTodayInVisibleDays,
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
import { RECEPTION_PLAN_DAY_HEADER_STICKY_TOP, RECEPTION_PLAN_TOOLBAR_SLOT_ID } from '../lib/receptionStickyChrome';
import { usePlanCalendarPeriodSwipe } from '../lib/usePlanCalendarPeriodSwipe';
import { PlanQuickFiltersBar } from './PlanQuickFiltersBar';
import { PlanQuickFiltersSheet } from './PlanQuickFiltersSheet';
import {
  PlanStayQuickActionsContextMenu,
  PlanStayQuickActionsSheet,
} from './PlanStayQuickActionsSheet';
import { useIsReceptionStayDetailBelowLg } from './ReceptionStayDetailShell';
import { Calendar, Check, Funnel } from 'lucide-react';
import { Button, Icon, SegmentedControl } from '@/shared/ui';
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
  /** When provided, yellow dot marks beds that are not ready (edit in Cleaning). */
  bedStatuses?: Record<string, HousekeepingBedStatus>;
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
  onCancelMoveMode?: () => void;
  onPickStayForMove?: (stayId: string) => void;
  /** Confirm vertical move to this bed (after in-grid target selection). */
  onPickBedForMove?: (bedId: string) => void;
  /** Plan long-press / right-click actions. */
  getStayQuickActions?: (stayId: string) => PlanStayQuickAction[];
  onStayQuickAction?: (stayId: string, actionId: PlanStayQuickActionId) => void;
  quickActionsBusy?: boolean;
}

const VIEW_MODE_ITEMS: {
  id: BedDayCalendarView;
  label: string;
  surfaces: Array<'mobile' | 'desktop'>;
}[] = [
  { id: '3days', label: '3 days', surfaces: ['mobile'] },
  { id: 'week', label: 'Week', surfaces: ['mobile', 'desktop'] },
  { id: 'month', label: 'Month', surfaces: ['desktop'] },
];

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

function formatDayHeaderParts(nightDate: string): { weekday: string; day: string } {
  const date = new Date(`${nightDate}T00:00:00.000Z`);
  const weekday = date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' });
  const day = date.toLocaleDateString('en', { day: 'numeric', timeZone: 'UTC' });
  return { weekday, day };
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

export function BedAccessCalendar({
  settings,
  stays,
  onViewStay,
  onSelectFreeNight,
  onSelectBlockedNight,
  embedded = false,
  tenantSlug,
  bedStatuses,
  planStayStatusEnabled = false,
  planToday,
  bedFilter = 'all',
  onBedFilterChange,
  focusToken,
  moveMode = null,
  moveTargetBedIds,
  moveBusy = false,
  onCancelMoveMode,
  onPickStayForMove,
  onPickBedForMove,
  getStayQuickActions,
  onStayQuickAction,
  quickActionsBusy = false,
}: BedAccessCalendarProps) {
  const isMobile = useIsMobileCalendar();
  const isBelowLg = useIsReceptionStayDetailBelowLg();
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

  // Mobile/tablet: 3days | week. Desktop: week | month (no 3days).
  const effectiveView: BedDayCalendarView = isBelowLg
    ? view === 'month'
      ? 'week'
      : view
    : view === '3days'
      ? 'week'
      : view;
  const lifecycleToday = planToday ?? todayUtcDate();
  const effectiveBedFilter = onBedFilterChange ? bedFilter : internalBedFilter;
  const moveActive = moveMode !== null;
  const movingStayId = moveMode?.phase === 'pickBed' ? moveMode.stayId : null;
  const movingStay = useMemo(
    () => (movingStayId ? stays.find((stay) => stay.id === movingStayId) ?? null : null),
    [movingStayId, stays]
  );
  const periodSwipeEnabled = isBelowLg && !moveActive;
  /** `<lg`: entire period fits viewport width (no horizontal day scroll). */
  const fitWidth = isBelowLg;
  const periodSwipe = usePlanCalendarPeriodSwipe({
    enabled: periodSwipeEnabled,
    onShift: (direction) => {
      setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, direction));
    },
  });
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
    ? `${resolveReceptionBedLabel(settings, quickMenuStay.bed_id) ?? quickMenuStay.bed_id} · ${stayRecordCheckInDate(quickMenuStay)} → ${stayRecordCheckOutDate(quickMenuStay)}`
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

  const monthLabel = formatPlanMonthLabel(snapshot.rangeStart, lifecycleToday);
  const todayInView = isPlanTodayInVisibleDays(lifecycleToday, snapshot.days);
  const viewSurface = isBelowLg ? 'mobile' : 'desktop';
  const viewModeItems = VIEW_MODE_ITEMS.filter((item) => item.surfaces.includes(viewSurface));
  const quickFiltersHideAll = quickFilteredRoomGroups.length === 0;

  const toolbar = (
    <div className="flex w-full flex-nowrap items-center gap-2">
      <span className="shrink-0 text-base font-semibold text-foreground">{monthLabel}</span>
      <SegmentedControl
        ariaLabel="Calendar view"
        items={viewModeItems.map((item) => ({ id: item.id, label: item.label }))}
        value={effectiveView}
        onValueChange={(id) => {
          setView(id as BedDayCalendarView);
          setAnchorDate(lifecycleToday);
        }}
        className="min-w-0"
      />
      {moveActive && onCancelMoveMode ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={moveBusy}
          className="hidden sm:inline-flex"
          onClick={onCancelMoveMode}
        >
          Cancel move
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="hidden lg:inline-flex"
        onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, -1))}
      >
        Prev
      </Button>
      {!todayInView ? (
        <Button type="button" size="sm" variant="outline" onClick={snapAnchorToPlanToday}>
          <Icon icon={Calendar} />
          Today
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="hidden lg:inline-flex"
        onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, 1))}
      >
        Next
      </Button>
      <div className="ml-auto shrink-0">
        {isBelowLg ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Filters"
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            className="relative"
            onClick={() => setFiltersOpen(true)}
          >
            <Icon icon={Funnel} />
            {anyFiltersActive ? (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
              />
            ) : null}
          </Button>
        ) : (
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
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {toolbarSlotEl ? createPortal(toolbar, toolbarSlotEl) : toolbar}

      {!isBelowLg && filtersOpen ? (
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

      <PlanQuickFiltersSheet
        open={isBelowLg && filtersOpen}
        onOpenChange={setFiltersOpen}
        settings={settings}
        filters={quickFilters}
        onFiltersChange={handleQuickFiltersChange}
        totalRoomCount={snapshot.roomGroups.length}
        visibleRoomCount={quickFilteredRoomGroups.length}
        freeBedsFilterOn={freeBedsFilterOn}
        onToggleFreeBeds={toggleFreeBedsFilter}
      />

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
      <div
        className={cn(
          // Match sticky day-header gap so top air does not shrink on scroll.
          'mt-2',
          // `clip` (not `auto`/`hidden`) keeps window scroll sticky day headers working.
          fitWidth || effectiveView !== 'month'
            ? 'w-full overflow-x-clip touch-pan-y'
            : 'overflow-x-auto',
          periodSwipeEnabled && 'touch-pan-y'
        )}
        {...periodSwipe}
      >
        <table
          className={cn(
            'w-full border-collapse text-xs',
            fitWidth || effectiveView !== 'month' ? 'table-fixed' : 'min-w-full'
          )}
        >
          <thead>
            <tr>
              <th
                data-plan-calendar-sticky
                aria-label="Bed"
                className={cn(
                  // Label rail + sticky day corner (stable gap under chrome).
                  'sticky left-0 z-[16] border-0 bg-background p-0 pt-2 pb-2.5',
                  RECEPTION_PLAN_DAY_HEADER_STICKY_TOP,
                  fitWidth ? 'w-10 max-w-10' : 'w-28'
                )}
              />
              {snapshot.days.map((nightDate) => {
                const isTodayColumn = nightDate === lifecycleToday;
                const { weekday, day } = formatDayHeaderParts(nightDate);
                return (
                  <th
                    key={nightDate}
                    title={`${weekday} ${day}${isTodayColumn ? ' · Today' : ''}`}
                    className={cn(
                      // Day labels outside booking table; sticky top gap matches resting air.
                      'sticky z-[15] border-0 bg-background pt-2 pb-2.5 font-medium',
                      RECEPTION_PLAN_DAY_HEADER_STICKY_TOP,
                      fitWidth || effectiveView !== 'month'
                        ? 'min-w-0 px-0.5 text-center'
                        : 'min-w-16 px-1.5 text-center'
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium tracking-wide text-muted-foreground">
                        {weekday}
                      </span>
                      <span
                        className={cn(
                          'text-base leading-none tabular-nums',
                          isTodayColumn
                            ? 'font-semibold text-primary'
                            : 'font-medium text-foreground'
                        )}
                      >
                        {day}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRoomGroups.map((group) => {
              return (
                <Fragment key={group.roomId}>
                  <tr>
                    <td
                      data-plan-calendar-sticky
                      className={cn(
                        'sticky left-0 z-10 border-0 bg-background py-1.5 pr-2 pl-0',
                        fitWidth ? 'w-10 max-w-10' : 'w-28'
                      )}
                    >
                      <span className="font-medium text-foreground">{group.roomLabel}</span>
                    </td>
                    <td
                      colSpan={snapshot.days.length}
                      className="border border-t-2 border-border bg-muted px-2 py-1.5"
                    />
                  </tr>
                  {group.rows.map((row) => {
                    const bedStatus = bedStatuses?.[row.bedId];
                    const showNotReadyDot =
                      bedStatuses != null && isHousekeepingBedNeedsWork(bedStatus);
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
                          data-plan-calendar-sticky
                          className={cn(
                            'sticky left-0 z-10 border-0 bg-background py-1.5 pr-2 pl-0',
                            fitWidth ? 'w-10 max-w-10' : 'w-28',
                            isPendingMoveTarget && 'z-20'
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-0.5">
                            <span
                              className="min-w-0 flex-1 truncate font-medium text-foreground"
                              title={row.displayLabel}
                            >
                              {row.displayLabel}
                            </span>
                            {/* Fixed-width trailing slot so the indicator does not shift with label length. */}
                            <span
                              className={cn(
                                'inline-flex shrink-0 items-center justify-center',
                                fitWidth ? 'size-1.5' : 'h-7 w-7'
                              )}
                            >
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
                                    'inline-flex items-center justify-center rounded-sm',
                                    fitWidth
                                      ? 'size-1.5 bg-primary text-primary-foreground'
                                      : 'size-7 rounded-md border border-primary/30 bg-primary/10 text-primary',
                                    'hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                                    'disabled:pointer-events-none disabled:opacity-60'
                                  )}
                                >
                                  {moveBusy ? (
                                    <span
                                      className={cn(
                                        'font-medium leading-none',
                                        fitWidth ? 'text-[6px]' : 'text-xs'
                                      )}
                                    >
                                      …
                                    </span>
                                  ) : (
                                    <Icon
                                      icon={Check}
                                      className={cn('shrink-0', fitWidth ? 'size-1.5' : 'size-4')}
                                      size={fitWidth ? 6 : 16}
                                    />
                                  )}
                                </button>
                              ) : showNotReadyDot ? (
                                <span
                                  role="img"
                                  aria-label="Bed not ready"
                                  title="Bed not ready"
                                  className="size-1.5 rounded-full bg-amber-500"
                                />
                              ) : null}
                            </span>
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
                                'border align-top',
                                fitWidth ? 'min-w-0 p-px' : 'p-0.5',
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
                                    'flex min-h-10 w-full min-w-0 items-center justify-center rounded bg-muted/10 text-[10px] text-muted-foreground hover:bg-muted/30',
                                    fitWidth ? 'px-0' : 'px-1',
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
                                      'flex min-h-10 w-full min-w-0 items-center justify-center rounded text-[10px]',
                                      fitWidth ? 'px-0' : 'px-1',
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
                                      'flex min-h-10 w-full min-w-0 items-center justify-center rounded text-[10px]',
                                      fitWidth ? 'px-0' : 'px-1',
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
                                    'flex min-h-10 w-full min-w-0 flex-col items-start justify-center gap-0.5 overflow-hidden rounded py-0.5 text-left text-[10px]',
                                    fitWidth ? 'px-0.5' : 'px-1',
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
                                  <span className="flex min-w-0 max-w-full items-center gap-0.5">
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
            actions={quickMenuActions.filter((action) => action.id !== 'open')}
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
